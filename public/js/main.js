$(function () {
    var term = new Terminal({
        cols: 80,
        rows: 24,
        cursorBlink: false
    });
    term.open($('#term').get(0));
    $('#term').css('width', term.element.clientWidth);
});
