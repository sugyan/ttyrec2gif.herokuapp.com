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
        $('#term').on({
            "dragover": function (e) {
                e.preventDefault();
                return false;
            },
            "drop": function (e) {
                e.stopPropagation();
                $('#sample').hide();
                $('#setting').hide();
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

        // setting
        var updateTerminal = function () {
            var cols = Number($('#setting').find('input[name="cols"]').val()) || 1;
            var rows = Number($('#setting').find('input[name="rows"]').val()) || 1;
            var color = $('#setting').find('input[name="color"]').val();
            var bcolor = $('#setting').find('input[name="background-color"]').val();
            if (cols !== term.cols || rows !== term.rows) {
                term.resize(cols, rows);
                $('#term').css({
                    "width": term.element.clientWidth,
                    "height": term.element.clientHeight
                });
            }
            $('.terminal').css('color', color);
            $('.terminal').css('background-color', bcolor);
            $('.terminal').css('border', bcolor + ' solid 5px');
        };
        $('#setting input').change(updateTerminal);
        $('input[name="color"], input[name="background-color"]').colorpicker().on('changeColor', updateTerminal);
    };

    TtyGif.prototype.playAndCapture = function (data) {
        var self = this;
        try {
            var sequence = TtyGif.parseTtyrecoord(data);
        } catch (e) {
            self.term.writeln('\x1b[31mparse error!!\x1b[m');
            return;
        }
        self.term.write('\x1b[m');
        self.term.write('\x1b[H\x1b[2J');
        self.term.focus();

        var prev;
        var num = 1;
        var capture = function (next) {
            html2canvas($('#term .terminal').get(0), {
                onrendered: function (canvas) {
                    $(document.body).append(
                        $(canvas).addClass('capture').data('number', num++).hide()
                    );
                    next();
                }
            });
        };
        var doLoop = function () {
            var block = sequence.shift();
            if (! block) {
                capture(self.onCaptureFinished);
                return;
            }

            var diff = 0;
            if (prev) {
                diff = ((block.timeval.sec - prev.sec) * 1000000 + (block.timeval.usec - prev.usec)) / 1000;
            }
            prev = block.timeval;

            if (diff < 10.0) {
                self.term.write(decodeURIComponent(escape(block.buffer)));
                doLoop();
            } else {
                capture(function () {
                    self.term.write(decodeURIComponent(escape(block.buffer)));
                    doLoop();
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
            max: $('canvas.capture').length,
            value: 1
        }).on('slide', function () {
            var val = $(this).slider('getValue');
            var image = $('canvas.capture').filter(function () {
                return $(this).data('number') === val;
            }).get(0);
            var canvas = $('<canvas>');
            var c = canvas.get(0);
            c.width = image.width;
            c.height = image.height;
            c.getContext('2d').drawImage(image, 0, 0);
            $('#image').empty().append(canvas.css('width', '100%'));
        }).trigger('slide');
        $('#editor').show();
    };

    $(function () {
        var ttygif = new TtyGif();

        $('#sample').on('dragstart', function (e) {
            e.originalEvent.dataTransfer.setData('ttyrec', String.fromCharCode.apply(null, new Uint8Array([
                0xc8, 0x5d, 0xe4, 0x53, 0xf3, 0x6e, 0x0c, 0x00, 0x08, 0x00, 0x00, 0x00, 0x1b, 0x5b, 0x3f, 0x31,
                0x30, 0x33, 0x34, 0x68, 0xc8, 0x5d, 0xe4, 0x53, 0x18, 0x6f, 0x0c, 0x00, 0x0a, 0x00, 0x00, 0x00,
                0x62, 0x61, 0x73, 0x68, 0x2d, 0x33, 0x2e, 0x32, 0x24, 0x20, 0xca, 0x5d, 0xe4, 0x53, 0x50, 0x47,
                0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x65, 0xca, 0x5d, 0xe4, 0x53, 0x2e, 0xbc, 0x03, 0x00, 0x01,
                0x00, 0x00, 0x00, 0x63, 0xca, 0x5d, 0xe4, 0x53, 0xc5, 0x33, 0x05, 0x00, 0x01, 0x00, 0x00, 0x00,
                0x68, 0xca, 0x5d, 0xe4, 0x53, 0x9b, 0x4c, 0x06, 0x00, 0x01, 0x00, 0x00, 0x00, 0x6f, 0xca, 0x5d,
                0xe4, 0x53, 0xd5, 0xa8, 0x07, 0x00, 0x01, 0x00, 0x00, 0x00, 0x20, 0xca, 0x5d, 0xe4, 0x53, 0x6b,
                0x80, 0x0d, 0x00, 0x01, 0x00, 0x00, 0x00, 0x27, 0xcb, 0x5d, 0xe4, 0x53, 0x91, 0x85, 0x06, 0x00,
                0x01, 0x00, 0x00, 0x00, 0x48, 0xcb, 0x5d, 0xe4, 0x53, 0x2b, 0x56, 0x09, 0x00, 0x01, 0x00, 0x00,
                0x00, 0x65, 0xcb, 0x5d, 0xe4, 0x53, 0x92, 0x14, 0x0c, 0x00, 0x01, 0x00, 0x00, 0x00, 0x6c, 0xcb,
                0x5d, 0xe4, 0x53, 0xe3, 0x65, 0x0e, 0x00, 0x01, 0x00, 0x00, 0x00, 0x6c, 0xcc, 0x5d, 0xe4, 0x53,
                0x30, 0xc5, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x6f, 0xcc, 0x5d, 0xe4, 0x53, 0x17, 0x2d, 0x06,
                0x00, 0x01, 0x00, 0x00, 0x00, 0x2c, 0xcc, 0x5d, 0xe4, 0x53, 0x03, 0x4b, 0x06, 0x00, 0x01, 0x00,
                0x00, 0x00, 0x20, 0xcc, 0x5d, 0xe4, 0x53, 0xa5, 0xd3, 0x0e, 0x00, 0x01, 0x00, 0x00, 0x00, 0x77,
                0xcd, 0x5d, 0xe4, 0x53, 0xd9, 0x2b, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x6f, 0xcd, 0x5d, 0xe4,
                0x53, 0x9f, 0x69, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x72, 0xcd, 0x5d, 0xe4, 0x53, 0x09, 0xc7,
                0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x6c, 0xcd, 0x5d, 0xe4, 0x53, 0x51, 0x6b, 0x06, 0x00, 0x01,
                0x00, 0x00, 0x00, 0x64, 0xcd, 0x5d, 0xe4, 0x53, 0xdb, 0x19, 0x0c, 0x00, 0x01, 0x00, 0x00, 0x00,
                0x21, 0xce, 0x5d, 0xe4, 0x53, 0x9f, 0x03, 0x07, 0x00, 0x01, 0x00, 0x00, 0x00, 0x27, 0xce, 0x5d,
                0xe4, 0x53, 0xf9, 0x62, 0x0a, 0x00, 0x02, 0x00, 0x00, 0x00, 0x0d, 0x0a, 0xce, 0x5d, 0xe4, 0x53,
                0x59, 0x63, 0x0a, 0x00, 0x0f, 0x00, 0x00, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x77,
                0x6f, 0x72, 0x6c, 0x64, 0x21, 0x0d, 0x0a, 0xce, 0x5d, 0xe4, 0x53, 0x76, 0x63, 0x0a, 0x00, 0x0a,
                0x00, 0x00, 0x00, 0x62, 0x61, 0x73, 0x68, 0x2d, 0x33, 0x2e, 0x32, 0x24, 0x20, 0xd0, 0x5d, 0xe4,
                0x53, 0xcf, 0xc0, 0x04, 0x00, 0x02, 0x00, 0x00, 0x00, 0x0d, 0x0a, 0xd0, 0x5d, 0xe4, 0x53, 0xfe,
                0xc0, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x62, 0x61, 0x73, 0x68, 0x2d, 0x33, 0x2e, 0x32, 0x24,
                0x20, 0xd1, 0x5d, 0xe4, 0x53, 0x76, 0x63, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x65, 0x78, 0x69,
                0x74, 0x0d, 0x0a
            ])));
        });
    });
}());
