using CadeMinhaRepublica.Application.DTO.Aggregate.Chat.Response;
using CadeMinhaRepublica.Application.DTO.Aggregate.Republic.Request;
using CadeMinhaRepublica.Application.DTO.Aggregate.User.Response;
using CadeMinhaRepublica.Application.Filter;
using CadeMinhaRepublica.Domain.Aggregate.Account.Repositories;
using CadeMinhaRepublica.Domain.Aggregate.Account.Services;
using CadeMinhaRepublica.Domain.Aggregate.Chat;
using CadeMinhaRepublica.Domain.Aggregate.Chat.Repositories;
using CadeMinhaRepublica.Domain.Aggregate.Chat.Services;
using CadeMinhaRepublica.Website.Seedwork.Facebook;
using Facebook;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CadeMinhaRepublica.Website.Hubs
{
    public class ChatHub : Hub
    {
        readonly IUserAppService _userAppService;
        readonly IChatAppService _chatAppService;
        readonly IUserRepository _userRepository;
        readonly IMessagesRepository _messagesRepository;
        readonly IConversationsRepository _conversationsRepository;
        static Dictionary<string, string> ConnectedUsers = new Dictionary<string, string>();

        public ChatHub(
            IConfiguration config,
            FacebookClient fbClient,
            IUserAppService userAppService,
            IUserRepository userRepository,
            IChatAppService chatAppService,
            IMessagesRepository messagesRepository,
            INotificationSender fbNotificationSender,
            IConversationsRepository conversationsRepository)
        {
            _userAppService = userAppService;
            _chatAppService = chatAppService;
            _userRepository = userRepository;
            _messagesRepository = messagesRepository;
            _conversationsRepository = conversationsRepository;
        }

        public async override Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();

            if (!Context.User.Identity.IsAuthenticated) return;

            var ip = Context.GetHttpContext().Request.GetIp();

            var me = await _userAppService.FindMe(ip, Context.User);

            await Groups.AddToGroupAsync(Context.ConnectionId, me.Id);

            ConnectedUsers.Add(Context.ConnectionId, me.Id);
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            ConnectedUsers.Remove(Context.ConnectionId);
            return base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessage(string toId, string message)
        {
            if (!Context.User.Identity.IsAuthenticated) return;

            await base.OnConnectedAsync();

            GetUserWithContactsResponseDTO me = (await _userAppService.FindMe(
                    ip: Context.GetHttpContext().Request.GetIp(),
                    Context.User));

            var request = new CreateConversationRequestDTO();
            request.To = new GetUserSummaryResponseDTO();
            request.ToId = toId;
            request.FromId = me.Id;
            request.Message = message;

            var success = await _chatAppService.SendMessage(request);

            await Clients.Groups(toId).SendAsync("ReceiveMessage", me.Id, me.Name, message, success.ConversationId);
        }

        public async Task<GetChatMessagesReadResponse> SetMessagesRead(Guid? conversationId, Guid? toId)
        {
            if (!conversationId.HasValue || !toId.HasValue) return new GetChatMessagesReadResponse(false);
            if (!Context.User.Identity.IsAuthenticated) return new GetChatMessagesReadResponse(false);

            var messagesFilter = MessagesFilter.GetFilters(new CreateGetMessagesRequestFilterDTO(fromId: toId.Value.ToString(), conversationId: conversationId, read: false));
            var messages = await _messagesRepository.FindAllAsync(
                filter: messagesFilter,
                orderBy: x => x.CreatedAt,
                ascending: true,
                selector: x => x);

            if (messages.Any())
            {
                var myId = (await _userAppService.FindMe(ctx: Context.User)).Id;
                if (messages.First().ToId != myId) return new GetChatMessagesReadResponse(false);

                foreach (var item in messages)
                {
                    item.Read = true;
                }
                await _conversationsRepository.CommitAsync();
            }

            return new GetChatMessagesReadResponse(true, conversatinId: conversationId.Value, toId: toId.Value, notReadCount: messages.Count());
        }
    }
}
