function initMenu() {
    var preloadbg = document.createElement("img");
    preloadbg.src = "https://s3-us-west-2.amazonaws.com/s.cdpn.io/245657/timeline1.png";

    $("#searchfield").focus(function () {
        if ($(this).val() == "Enviar mensagem...") {
            $(this).val("");
        }
    });
    $("#searchfield").focusout(function () {
        if ($(this).val() == "") {
            $(this).val("Enviar mensagem...");

        }
    });

    $("#sendmessage input").focus(function () {
        if ($(this).val() == "Enviar mensagem...") {
            $(this).val("");
        }
    });
    $("#sendmessage input").focusout(function () {
        if ($(this).val() == "") {
            $(this).val("Enviar mensagem...");
        }
    });
    $(".friend").each(function () {
        setupFriendDivEvents(this);
    });
}

function setupFriendDivEvents(self) {
    self = $(self);
    self.click(function () {
        var childOffset = self.offset();
        var parentOffset = self.parent().parent().offset();
        var childTop = childOffset.top - parentOffset.top;
        var clone = self.find('.user-img').eq(0).clone();
        var top = childTop + 80 + "px";
        var container = self.parents('.chat-container');
        var chatBox = self.parents('#chatbox');

        chatBox.attr('active-user', self.attr('other-id'));

        $(clone).css({ 'top': top }).addClass("floatingImg").appendTo(chatBox);

        setTimeout(function () { container.find("#profile p").addClass("animate"); container.find("#profile").addClass("animate"); }, 100);
        setTimeout(function () {
            container.find("#chat-messages").addClass("animate");
            container.find('.cx, .cy').addClass('s1');
            setTimeout(function () { container.find('.cx, .cy').addClass('s2'); }, 100);
            setTimeout(function () { container.find('.cx, .cy').addClass('s3'); }, 200);
        }, 150);

        $('.floatingImg').animate({
            'width': "68px",
            'left': '115px',
            'top': '10px'
        }, 200);

        var name = $(this).find("p strong").html();
        var email = $(this).find("p span").html();

        container.find("#profile p").html(name);
        container.find("#profile span").html(email);
        container.find(".message").not(".right").find("img").attr("src", $(clone).attr("src"));
        chatBox.find('.friend').fadeOut();
        container.find('#chatview').fadeIn();
        container.find('#close').unbind("click").click(function () {
            closeChat(container, top, chatBox);
        });
        onFriendClicked(self);
    });
}

function closeChat(container, top, chatBox) {
    container.find("#chat-messages, #profile, #profile p").removeClass("animate");
    container.find('.cx, .cy').removeClass("s1 s2 s3");
    $('.floatingImg').animate({
        'width': "40px",
        'top': top,
        'left': '12px'
    }, 200, function () { $('.floatingImg').remove(); });
    $("#topmenu").fadeIn();

    setTimeout(function () {
        container.find('#chatview').fadeOut();
        $('#chatbox .friend').fadeIn();
    }, 50);
    chatBox.removeAttr('active-user');
}

function onFriendClicked(self) {
    $("#topmenu").hide();
    var count = parseInt(self.find('.conversation-counter').html());
    setNotificationCounter(count, false);
    setNotificationCounter(count, false, $('.chat-container[id="' + self.parents('.chat-container').attr('id') + '"]').find('.conversation-counter'));
    if (self.hasClass('initialized')) return;
    self.addClass('initialized');
    onShowContactClick(self);
    triggerMessagesRead(self);
}

function triggerMessagesRead(e) {

    var id = e.parents('.chat-container').attr('id');
    var toId = e.attr('other-id');

    if (id && id !== "") {
        connection
            .invoke("SetMessagesRead", id, toId)
            .then(onContectsRead);
    }
}

function onContectsRead(response) {
    if (response && response.success === true) {
        var container = $(".chat-container[id='" + response.conversationId + "']");
        container.find('.not-read-counter').removeClass('active');
        container.find('.conversation-counter').html('0');
    }
}

function onShowContactClick(e) {
    e = $(e);
    var modal = e.parent().find('.await-modal');
    modal.removeClass('await-modal');
    e.parents('.geodir-category-contact').removeClass('abs');
    modal.addClass('async-modal');
    initAsyncModals(modal.parent());
    e.hide();
}

"use strict";
var connection = null;
function initSignalR() {
    try {
        connection = new signalR.HubConnectionBuilder().withUrl("/chathub").build();
        //Disable send button until connection is established
        $(".chat-container #sendmessage button").disabled = true;

        connection.on("ReceiveMessage", OnReceiveMessage);

        connection.start().then(onConnectionStart).catch(function (err) {
            return console.error(err.toString());
        });

        $(".chat-container #sendmessage button").on("click", sendMessage);

        initMenu();
    } catch (e) {
        console.log(e);
        //alert('error');
    }
}

function onMessagesRead(conversationId) {
    alert(conversationId);
}

function onConnectionStart() {
    $(".chat-container #sendmessage button").disabled = false;
}

function sendMessage(event) {
    event.preventDefault();
    var toId = $(this).parents('#sendmessage').attr('to');
    var input = $(this).parents('.chat-container').find('#sendmessage input');
    var message = input.val();
    addMessage(toId, input.val(), true);
    input.val("");
    connection.invoke("SendMessage", toId, message).catch(function (err) {
        alert('erro ao enviar a mensagem');
        return console.error(err.toString());
    });
}

function onChatOpenned(userId) {
}

function OnReceiveMessage(userId, userName, message, convId) {
    addConversation(userId, userName, false, convId);
    addMessage(userId, message, false);
    if ($('#chatbox').attr('active-user') !== userId) {
        var container = $('.chat-container[id="' + convId + '"]').find('.conversation-counter');
        setNotificationCounter(1, true);
        setNotificationCounter(1, true, container);
    }
}

function addConversation(otherId, otherName, forceOpen, convId, notReadCount) {
    if (!otherId) return;

    var existingContainer = $(".friend[other-id='" + otherId + "']");
    if (existingContainer.length === 0) {
        var toClone = $($(".friend.default")[0]);
        toClone.clone().appendTo('#friendslist #friends .chat-container');
        toClone.find('.user-img').attr('src', 'https://s3-sa-east-1.amazonaws.com/ninho-91782606-0c9b-4cd6-9e48-84955973f00c/' + otherId + '/user-details/photos/profile_picture.jpg');
        toClone.addClass('initialized');
        toClone.removeClass('default');
        toClone.find('form').attr('initialized', 'true');
        toClone.find('.default').removeClass('default');
        toClone.attr("other-id", otherId);
        toClone.parents('.chat-container').attr('id', convId);
        toClone.parents('.chat-container').find("#sendmessage").attr("to", otherId);
        $(".not-found-msg").hide();
        setupFriendDivEvents(toClone[0]);
        existingContainer = toClone;
        toClone.find(".time").html('1m');
        if (otherName && otherName.length > 25)
            otherName = otherName.substring(0, 25) + '...';
        //toClone.find('messages-container').html('');
        toClone.find(".user-name").html(otherName);

        if (notReadCount && notReadCount > 0) {
            var counter = toClone.find('.conversation-counter');
            counter.parents('.not-read-counter').addClass('active');
            counter.html(notReadCount);
        }
    }
    if (forceOpen)
        existingContainer.click();
}

function addMessage(otherId, input, mine) {
    var existingContainer = $(".friend[other-id='" + otherId + "']");
    if (existingContainer.length > 0) {
        var messagesContainer = $(existingContainer.parents('.chat-container').find('.messages-container')[1]);

        messagesContainer = existingContainer.parent().find('.messages-container').last();
        var toClone = existingContainer.parent().find('.message.default').clone().appendTo(messagesContainer);
        var mySrc = $(".header-user-name img").attr("src");
        var src = mine === true ? mySrc : 'https://s3-sa-east-1.amazonaws.com/ninho-91782606-0c9b-4cd6-9e48-84955973f00c/' + otherId + '/user-details/photos/profile_picture.jpg';
        toClone.find('.user-img').attr('src', src);
        toClone.removeClass('default');
        toClone.find('.default').removeClass('default');
        toClone.find(".message-txt").html(input);
        toClone.find(".time").html('1m');
        if (mine === true)
            toClone.addClass('right');
        $(this).parents('.chat-container').find('#sendmessage input').val("");

        var div = messagesContainer;
        div[0].scrollTop = (div[0].scrollHeight);
        if (input && input.length > 20)
            input = input.substring(0, 20) + '...';
        existingContainer.find('.last-message').html(input);
    }
}

function openMenu() {

    if (!$(".chat-widget-button").hasClass('closechat_btn')) {

        showChat();
        $(".chat-widget_wrap").addClass('on-top');
        $(".header-user-name img").fadeOut();
        $(".user-menu.alt-tip").click();
        $(".chat-container #close").click();
    }
    else {
        hideChat();
    }
}

function addNinhoChat() {
    addConversation();
}



function onOpenChat(userId, userName, forceOpen) {
    $(".chat-container #chatview").fadeOut("fast");

    addConversation(userId, userName, forceOpen);

    if ($(".chat-widget_wrap.not-vis-chat").length > 0) {
        openMenu();
    }

    $(".friends.alt-tip").length > 0 && $(".friends.alt-tip")[0].click();
}

function onUserMenuCLick(self) {
    self = $(self);
    if (self.hasClass('active')) return;

    var clss = self.attr('class').split(' ')[0];
    var operator = '.' + clss + '-' + 'container';
    var menu = $('.floating-menu' + operator);
    $(".floating-menu").hide();
    $(".floating-menu").removeClass('active');
    menu.fadeIn();
    $(".alt-tip").removeClass('active');
    $(".menu-user-name").removeClass('active');
    self.addClass('active');
    if (clss === 'user-menu') {
        $(".menu-user-name").addClass('active');
    }
}

function setChatCounter(num) {
    $(".chat-couner").html(num);
}

function incrementCounter(convId) {

}

function decrementCount(convId) {

}

function setNotificationCounter(num, add, counter) {

    if (num === 0) return;

    var counter = counter || $('.chat-counter');
    var lastVal = parseInt(counter.html());

    if (add === true)
        lastVal += num;
    else
        lastVal -= num;

    counter.html(lastVal);
    checkChatCounter(counter, lastVal);
}

function checkChatCounter(counter, num) {
    var parent = counter.parents('.not-read-counter');
    if (parent.hasClass('active') && num <= 0) {
        counter.html(0);
        parent.removeClass('active');
    }
    else if (num > 0) {
        parent.addClass('active');
    }
}
