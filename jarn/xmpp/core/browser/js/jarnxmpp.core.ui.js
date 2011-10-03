/*
    Event handlers
*/

// Presence handler

$(document).bind('jarnxmpp.presence', function (event, jid, status, presence) {
    var user_id = Strophe.getNodeFromJid(jid);
    var barejid = Strophe.getBareJidFromJid(jid);
    var existing_element = $('#online-users-'+user_id);
    if (existing_element.length) {
        if (status==='offline' && jarnxmpp.Presence.online.hasOwnProperty(user_id))
             return;
        existing_element.attr('class', status);
    } else {
        $.get('xmpp-userDetails?jid=' + barejid, function(user_details) {
            user_details = $(user_details);
            user_details.find('.send-message').prepOverlay({
                subtype: 'ajax',
            });
            $('#online-users').append(user_details);

        });
    }
    var counter = 0;
    for (var key in jarnxmpp.Presence.online) {
        if (jarnxmpp.Presence.online.hasOwnProperty(key))
            counter++;
    }
    $('#online-count').text(counter);
});

$(document).bind('jarnxmpp.message', function (event) {
    var user_id = Strophe.getNodeFromJid(event.from);
    var jid = Strophe.getBareJidFromJid(event.from);
    var text_p = $('<p>').text(event.body);
    var reply_p = $('<p>');
    var reply_link = $('<a>')
        .attr('class', 'reply-link')
        .attr('href', 'sendXMPPMessage?message-recipient=' + jid)
        .text('Reply');
    reply_p.append(reply_link);
    var text = $('<div>').append(text_p).append(reply_p).remove().html();
    jarnxmpp.Presence.getUserInfo(user_id, function(data) {
        $.gritter.add({
            title: data.fullname,
            text: text,
            image: data.portrait_url,
            sticky: true,
            after_open: function (e) {
                e.find('.reply-link').prepOverlay({
                    subtype: 'ajax'
                });
            }
        });
    });
});

// Pub-Sub
$(document).bind('jarnxmpp.nodePublished', function (event) {
    jarnxmpp.Presence.getUserInfo(event.author, function(data) {
        $.gritter.add({
            title: data.fullname,
            text: event.content,
            image: data.portrait_url
        });
    });
});

// Logging

$(document).bind('jarnxmpp.dataReceived', function (ev) {
    $('#xmpp-log').append($('<div>').addClass('xmpp-dataRcvd').text(ev.text));
});

$(document).bind('jarnxmpp.dataSent', function (ev) {
    $('#xmpp-log').append($('<div>').addClass('xmpp-dataSent').text(ev.text));
});

$(document).ready(function () {

    $('#sendXMPPMessage').live('submit', function () {
        var text = $(this).find('textarea[name="message"]').attr('value');
        var recipient = $(this).find('input[name="message-recipient"]').attr('value');
        var message = $msg({to: recipient, type: 'chat'})
            .c('body').t(text);
        jarnxmpp.connection.send(message);
        $(this).parents('.overlay').data('overlay').close();
        return false;
    });

    $('#toggle-online-users').bind('click', function (el) {
        $('#online-users').toggleClass('deactivated');
        return false;
    });

    $('.pubsub-post').prepOverlay({
        subtype: 'ajax'
    });

    $('a.magic-link').each(function () {
        var link = this;
        $(link).hide();
        $(link).children('.magic-favicon').hide();
        $.getJSON(portal_url+"/magic-links?url="+$(link).attr('href'), function(data) {
            $(link).children('.magic-link-title').html(data.title);
            $(link).children('.magic-link-descr').html(data.description);
            $(link).children('.magic-favicon').attr('src', data.favicon_url);
            $(link).children('.magic-favicon').show();
            $(link).show();
        });
    }); 

});
