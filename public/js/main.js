(function () {
    var TtyGif = TtyGif || {};

    TtyGif = function () {
        this.init();
    };

    TtyGif.parseTtyrecoord = function (data) {
        var uint32le = function (data, pos) {
            var val = 0;
            val += data.charCodeAt(pos + 0) <<  0;
            val += data.charCodeAt(pos + 1) <<  8;
            val += data.charCodeAt(pos + 2) << 16;
            val += data.charCodeAt(pos + 3) << 24;
            return val;
        };
        var results = [];
        var pos = 0;
        var sec, usec, len;
        while (pos < data.length) {
            sec  = uint32le(data, pos + 0);
            usec = uint32le(data, pos + 4);
            len  = uint32le(data, pos + 8);
            if (len < 0 || pos + len + 12 > data.length) {
                throw new Error("parse error");
            }
            results.push({
                timeval: {
                    sec: sec,
                    usec: usec
                },
                buffer: data.substr(pos + 12, len)
            });
            pos += len + 12;
        }
        return results;
    };

    TtyGif.prototype.init = function () {
        var self = this;
        var term = this.term = new Terminal({
            cols: 80,
            rows: 24,
            cursorBlink: false
        });
        term.open($('#term').get(0));
        $('#term').css({
            "width": term.element.clientWidth,
            "height": term.element.clientHeight
        });
        $('#term').bind({
            "dragover": function (e) {
                e.preventDefault();
                return false;
            },
            "drop": function (e) {
                e.stopPropagation();
                $('#sample').hide();
                $('#term').unbind('drop');

                self.started = true;
                // read from dropped file
                if (e.originalEvent.dataTransfer.files.length > 0) {
                    var file = e.originalEvent.dataTransfer.files[0];
                    var fileReader = new window.FileReader();
                    fileReader.onload = function (event) {
                        self.playAndCapture(event.target.result);
                    };
                    fileReader.readAsBinaryString(file);
                } else {
                    self.playAndCapture(e.originalEvent.dataTransfer.getData('ttyrec'));
                }
                return false;
            }
        });

        // prompt
        (function writePrompt (str) {
            if (self.started) {
                return;
            }
            if (str.length > 0) {
                var s = str[0];
                term.write(s);
                window.setTimeout(function () {
                    writePrompt(str.substr(1));
                }, s.match(/\w/) ? 30 : 0);
            } else {
                term.writeln('');
            }
        }('$ drag and drop your \x1b[32mttyrec\x1b[m record file into this terminal!'));
    };

    TtyGif.prototype.playAndCapture = function (data) {
        var self = this;
        try {
            var sequence = TtyGif.parseTtyrecoord(data);
        } catch (e) {
            self.term.writeln('\x1b[31mparse error!!\x1b[m');
            return;
        }
        var prev;
        var num = 1;
        self.term.write('\x1b[m');
        self.term.write('\x1b[H\x1b[2J');
        self.term.focus();
        var doLoop = function () {
            var block = sequence.shift();
            if (! block) {
                self.onCaptureFinished();
                return;
            }

            var diff = 0;
            if (prev) {
                diff = ((block.timeval.sec - prev.sec) * 1000000 + (block.timeval.usec - prev.usec)) / 1000;
            }
            prev = block.timeval;

            self.term.write(decodeURIComponent(escape(block.buffer)));
            if (diff < 10.0) {
                doLoop();
            } else {
                html2canvas($('#term').get(0), {
                    onrendered: function (canvas) {
                        $(document.body).append(
                            $('<img>').addClass('capture').attr(
                                'src', canvas.toDataURL()
                            ).data('number', num++).hide()
                        );
                        doLoop();
                    }
                });
            }
        };
        doLoop();
    };

    TtyGif.prototype.onCaptureFinished = function () {
        var self = this;
        $('#term').hide();

        $('#slider').slider({
            min: 1,
            max: $('img.capture').length,
            value: 1
        }).bind('slide', function () {
            var val = $(this).slider('getValue');
            var image = $('img.capture').filter(function () {
                return $(this).data('number') === val;
            });
            $('#image').empty().append($(image).clone().css('width', '100%').show());
        }).trigger('slide');
        $('#editor').show();
    };

    $(function () {
        var ttygif = new TtyGif();

        $('#sample').bind('dragstart', function (e) {
            e.originalEvent.dataTransfer.setData('ttyrec', String.fromCharCode.apply(null, new Uint8Array([
                0x1d, 0xa7, 0xdf, 0x53, 0x84, 0x5f, 0x0a, 0x00,  0x12, 0x00, 0x00, 0x00, 0x1b, 0x5b, 0x3f, 0x31,
                0x30, 0x33, 0x34, 0x68, 0x62, 0x61, 0x73, 0x68,  0x2d, 0x33, 0x2e, 0x32, 0x24, 0x20, 0x1e, 0xa7,
                0xdf, 0x53, 0x4b, 0x2e, 0x04, 0x00, 0x01, 0x00,  0x00, 0x00, 0x65, 0x1e, 0xa7, 0xdf, 0x53, 0x1c,
                0x1c, 0x07, 0x00, 0x01, 0x00, 0x00, 0x00, 0x63,  0x1e, 0xa7, 0xdf, 0x53, 0xc3, 0x35, 0x08, 0x00,
                0x01, 0x00, 0x00, 0x00, 0x68, 0x1e, 0xa7, 0xdf,  0x53, 0x1d, 0x6d, 0x09, 0x00, 0x01, 0x00, 0x00,
                0x00, 0x6f, 0x1e, 0xa7, 0xdf, 0x53, 0xe6, 0x8a,  0x0a, 0x00, 0x01, 0x00, 0x00, 0x00, 0x20, 0x1e,
                0xa7, 0xdf, 0x53, 0xe2, 0x30, 0x0e, 0x00, 0x01,  0x00, 0x00, 0x00, 0x27, 0x1f, 0xa7, 0xdf, 0x53,
                0xb2, 0x72, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00,  0x48, 0x1f, 0xa7, 0xdf, 0x53, 0x21, 0x02, 0x06,
                0x00, 0x01, 0x00, 0x00, 0x00, 0x65, 0x1f, 0xa7,  0xdf, 0x53, 0xfb, 0xab, 0x08, 0x00, 0x01, 0x00,
                0x00, 0x00, 0x6c, 0x1f, 0xa7, 0xdf, 0x53, 0x42,  0xdd, 0x0a, 0x00, 0x01, 0x00, 0x00, 0x00, 0x6c,
                0x1f, 0xa7, 0xdf, 0x53, 0x41, 0x16, 0x0d, 0x00,  0x01, 0x00, 0x00, 0x00, 0x6f, 0x20, 0xa7, 0xdf,
                0x53, 0x65, 0xe2, 0x00, 0x00, 0x01, 0x00, 0x00,  0x00, 0x2c, 0x20, 0xa7, 0xdf, 0x53, 0xb2, 0x39,
                0x02, 0x00, 0x01, 0x00, 0x00, 0x00, 0x20, 0x20,  0xa7, 0xdf, 0x53, 0xc5, 0x85, 0x05, 0x00, 0x01,
                0x00, 0x00, 0x00, 0x77, 0x20, 0xa7, 0xdf, 0x53,  0x02, 0x3b, 0x07, 0x00, 0x01, 0x00, 0x00, 0x00,
                0x6f, 0x20, 0xa7, 0xdf, 0x53, 0xa7, 0xca, 0x08,  0x00, 0x01, 0x00, 0x00, 0x00, 0x72, 0x20, 0xa7,
                0xdf, 0x53, 0x67, 0x61, 0x0a, 0x00, 0x01, 0x00,  0x00, 0x00, 0x6c, 0x20, 0xa7, 0xdf, 0x53, 0x77,
                0xfc, 0x0b, 0x00, 0x01, 0x00, 0x00, 0x00, 0x64,  0x21, 0xa7, 0xdf, 0x53, 0x0c, 0x92, 0x02, 0x00,
                0x01, 0x00, 0x00, 0x00, 0x21, 0x21, 0xa7, 0xdf,  0x53, 0x8f, 0x85, 0x0a, 0x00, 0x01, 0x00, 0x00,
                0x00, 0x27, 0x21, 0xa7, 0xdf, 0x53, 0x42, 0x05,  0x0f, 0x00, 0x02, 0x00, 0x00, 0x00, 0x0d, 0x0a,
                0x21, 0xa7, 0xdf, 0x53, 0x36, 0x08, 0x0f, 0x00,  0x0f, 0x00, 0x00, 0x00, 0x48, 0x65, 0x6c, 0x6c,
                0x6f, 0x2c, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64,  0x21, 0x0d, 0x0a, 0x21, 0xa7, 0xdf, 0x53, 0x75,
                0x08, 0x0f, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x62,  0x61, 0x73, 0x68, 0x2d, 0x33, 0x2e, 0x32, 0x24,
                0x20, 0x23, 0xa7, 0xdf, 0x53, 0x41, 0x51, 0x02,  0x00, 0x02, 0x00, 0x00, 0x00, 0x0d, 0x0a, 0x23,
                0xa7, 0xdf, 0x53, 0xc5, 0x51, 0x02, 0x00, 0x0a,  0x00, 0x00, 0x00, 0x62, 0x61, 0x73, 0x68, 0x2d,
                0x33, 0x2e, 0x32, 0x24, 0x20, 0x23, 0xa7, 0xdf,  0x53, 0x7c, 0xb9, 0x0a, 0x00, 0x06, 0x00, 0x00,
                0x00, 0x65, 0x78, 0x69, 0x74, 0x0d, 0x0a
            ])));
        });
    });
}());
