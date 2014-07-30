$(function () {
    term = new Terminal({
        cols: 80,
        rows: 24
    });
    term.open($('#term').get(0));
    term.write('\x1b[31mWelcome to term.js!\x1b[m\r\n');
    term.blur();
});
