function TtyrecordParser (data) {
    this.sequence = [];
    var pos = 0;
    var sec, usec, len;
    while (pos < data.length) {
        sec  = this.uint32le(data, pos + 0);
        usec = this.uint32le(data, pos + 4);
        len  = this.uint32le(data, pos + 8);
        if (len < 0 || pos + len + 12 > data.length) {
            throw new Error("parse error");
        }
        this.sequence.push({
            timeval: {
                sec: sec,
                usec: usec
            },
            buffer: data.substr(pos + 12, len)
        });
        pos += len + 12;
    }
}

TtyrecordParser.prototype.uint32le = function (data, pos) {
    var val = 0;
    val += data.charCodeAt(pos + 0) <<  0;
    val += data.charCodeAt(pos + 1) <<  8;
    val += data.charCodeAt(pos + 2) << 16;
    val += data.charCodeAt(pos + 3) << 24;
    return val;
};

$(function () {
    term = new Terminal({
        cols: 80,
        rows: 24
    });
    term.open($('#term').get(0));
    term.blur();

    // Drop
    var cancelEvent = function (event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    };
    $('#term').bind('dragenter', cancelEvent);
    $('#term').bind('dragover', cancelEvent);
    $('#term').bind('drop', function (event) {
        var file = event.originalEvent.dataTransfer.files[0];
        var fileReader = new FileReader();
        fileReader.onload = function(event) {
            var parser = new TtyrecordParser(event.target.result);
            var prev;
            var doLoop = function () {
                var diff;
                var block = parser.sequence.shift();
                if (! block) { return; }

                if (prev) {
                    diff = ((block.timeval.sec - prev.sec) * 1000000 + (block.timeval.usec - prev.usec)) / 1000;
                } else {
                    diff = 0;
                }
                prev = block.timeval;
                window.setTimeout(function () {
                    term.write(block.buffer);
                    doLoop();
                }, diff);
            };
            doLoop();
        };
        fileReader.readAsBinaryString(file);
        return cancelEvent(event);
    });
});
