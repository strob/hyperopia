var HYPER = HYPER || {};
(function(HYPER) {
    HYPER.WikiPage = function(name, display) {
        var that = this;
        this.name = name;
        this.$el = $("<span>")
            .addClass("wikipage")
            .append($("<span>", {title: name})
                    .addClass('name')
                    .html(display || name)
                    .click(function() { that.toggle(); }));
    };
    HYPER.WikiPage.prototype.fetch_raw = function(cb) {
        // Loads RAW page and triggers callback
        var that = this;

        if(this.raw) { return cb(this.raw); }
        $.get('/raw/'+this.name, {}, function(txt, status) {
            if(status === 'success') {
                that.raw = txt;
                cb(txt);
            }
            else {
                console.log("bad status", statusCode, that.name);
            }
        });
    };
    HYPER.WikiPage.prototype.toggle = function() {
        if(this.expanded) {
            this.expanded = false;
            this.contract();
        }
        else {
            this.expanded = true;
            this.expand();
        }
    };
    HYPER.WikiPage.prototype.contract = function() {
        this.$el.find(".wikibody").remove();
    };
    HYPER.WikiPage.prototype.expand = function() {
        var that = this;
        this.fetch_raw(function(txt) {
            that.$el.append(HYPER.parse_wikitext(txt).addClass('wikibody'));
        });
    };
    HYPER.Book = function(spec) {
        this.spec = spec;
    };
    HYPER.Tree = function() {
    };
    HYPER.Template = function(raw) {
        var that = this;

        this.raw = raw;

        // basic parser.
        var fields = raw.split('|');
        this.args = [];
        this.kw = {};
        fields.forEach(function(val) {
            var kv = val.split('=');
            var k = strip(kv[0]);
            if(kv.length===1) {
                that.args.push(k);
            }
            else {
                that.kw[k] = strip(kv[1]);
            }
        });

        this.$el = $("<div>")
            .append($("<span>")
                    .addClass('template')
                    .html(this.args[0])
                    .click(function() {that.toggle();}));
    };
    HYPER.Template.prototype.toggle = function() {
        // XXX: Abstract?
        if(this.expanded) {
            this.expanded = false;
            this.contract();
        }
        else {
            this.expanded = true;
            this.expand();
        }
    };
    HYPER.Template.prototype.expand = function() {
        var that = this;
        this.$rendered = $("<div>")
            .addClass('templatebody')
            .appendTo(this.$el);
        this.args.slice(1).forEach(function(arg) {
            $("<span>")
                .addClass('arg')
                .html(arg)
                .appendTo(that.$rendered);
        });
        var $table = $("<table>")
            .appendTo(this.$rendered);
        for(var key in this.kw) {
            var val = this.kw[key];
            $("<tr>")
                .appendTo($table)
                .append($("<td>").html(key))
                .append($("<td>").html(val));
        };
    };
    HYPER.Template.prototype.contract = function() {
        this.$rendered.remove();
    };

    function strip(txt) {
        return txt
            .replace(/^\s*/g, '')
            .replace(/\s*$/g, '');
    }

    function split_parse(txt, splitExp, onMatch) {
        var $out = $("<div>");
        txt.split(splitExp).forEach(function(seg) {
            $out.append(onMatch(seg));
        });
        return $out;
    };
    function paragraphs(txt, onMatch) {
        return split_parse(txt,
                           /\n\n/g,
                           function(para) {return $("<p>").append(onMatch(para));});
    };
    function sweep_parse(txt, startExp, endExp, onMatch, onFill, startLen, endLen) {
        var $out = $("<span>");
        var cur_idx = 0;
        var last_end= 0;
        var starts = [];
        while(true) {
            var next_st = txt.slice(cur_idx).search(startExp);
            var next_end= txt.slice(cur_idx).search(endExp);
            if(next_st < next_end && next_st >= 0) {
                starts.push(next_st + cur_idx);
                cur_idx += next_st + startLen;
            }
            else if(next_end >= 0) {
                var start = starts.pop();
                if(start !== undefined && starts.length === 0) {
                    if(last_end < start) {
                        $out.append(onFill(txt.slice(last_end, start)));
                    }
                    last_end = cur_idx + next_end;
                    $out.append(onMatch(txt.slice(start+startLen, last_end)));
                    last_end += endLen;
                }
                cur_idx += next_end+endLen;
            }
            else {
                $out.append(onFill(txt.slice(last_end)));
                return $out;
            }
        }
    };

    function templates(txt, onFill) {
        return sweep_parse(txt, '{{', '}}', function(templ) {
            var temp = new HYPER.Template(templ);
            // temp.expand();
            // console.log(temp);
            return temp.$el;
        }, onFill, 2, 2);
    }
    function wikihacks(txt) {
        function headings(txt) {
            var i = 6;
            var out = txt.slice(0);
            while(i>0) {
                var bar = '';
                for(var j=0; j<i; j++) {
                    bar += '=';
                }
                var re = new RegExp('^'+bar+'(.*)'+bar, 'gm');
                out = out.replace(re, '<h'+i+'>$1</h'+i+'>\n');
                i--;
            }
            return out;
        }
        return headings(txt)
            .replace(/[\n^][\*#]/g, '<br>');
    }
    function wikilinks(txt) {
        return sweep_parse(txt, /\[\[/g, /\]\]/g, function(link) {
            if(link.indexOf("File:") >= 0 || link.indexOf("Image:") >= 0) {
                return [];
            }
            var split = link.split('|');
            var page = new HYPER.WikiPage(split[0], split[split.length-1]);
            return page.$el;
            // return $("<a>", {href: '/a/'+split[0]}).html(split[split.length-1]);
        }, wikihacks, 2, 2);
    };

    function identity(x) { return x; }
    function wipe(x) { return ''; }

    HYPER.parse_wikitext = function(txt) {
        return paragraphs(txt, function(para) {
            return templates(para, wikilinks);
        });
    };
})(HYPER);
