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
        rows: 24,
        cursorBlink: false
    });
    term.open($('#term').get(0));
    term.write('$ ');
    window.setTimeout(function () {
        (function writePrompt (str) {
            if (str.length > 0) {
                term.write(str[0]);
                window.setTimeout(function () {
                    writePrompt(str.substr(1));
                }, 70);
            } else {
                term.write('\r\n');
                term.blur();
            }
        }('Drop ttyrecord file here!'));
    }, 500);

    // Drop event
    var cancelEvent = function (event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    };
    var onFileLoaded = function (event) {
        var parser;
        try {
            parser = new TtyrecordParser(event.target.result);
        } catch (e) {
            term.writeln('\x1b[31mparse error!!\x1b[m');
            return;
        }
        var prev;
        var gif = new GIF({
            workers: 10,
            workerScript: '/js/lib/gif.js/gif.worker.js'
        });
        // clear and focus
        term.write('\x1b[H\x1b[2J');
        term.focus();
        var doLoop = function () {
            var block = parser.sequence.shift();
            if (! block) {
                gif.on('finished', function(blob) {
                    $('#term').remove();
                    $(document.body).append($('<img>').attr('src', URL.createObjectURL(blob)));
                });
                gif.render();
                return;
            }

            var diff = 0;
            if (prev) {
                diff = ((block.timeval.sec - prev.sec) * 1000000 + (block.timeval.usec - prev.usec)) / 1000;
            }
            prev = block.timeval;

            if (diff < 10.0) {
                term.write(block.buffer);
                doLoop();
            } else {
                html2canvas($('#term').children(0), {
                    onrendered: function (canvas) {
                        gif.addFrame(canvas, { delay: diff });
                        term.write(block.buffer);
                        doLoop();
                    }
                });
            }
        };
        doLoop();
    };
    $('#term').bind('dragenter', cancelEvent);
    $('#term').bind('dragover', cancelEvent);
    $('#term').bind('drop', function (event) {
        var file = event.originalEvent.dataTransfer.files[0];
        var fileReader = new FileReader();
        fileReader.onload = onFileLoaded;
        fileReader.readAsBinaryString(file);
        return cancelEvent(event);
    });
});
