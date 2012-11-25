var HYPER = HYPER || {};
(function(HYPER) {
    HYPER.WikiPage = function(name) {
        var that = this;
        this.name = name;
        this.$el = $("<div>")
            .addClass("wikipage")
            .append($("<h1>")
                    .html(decodeURI(name))
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
            this.contract();
        }
        else {
            this.expand();
        }
    };
    HYPER.WikiPage.prototype.contract = function() {
        this.expanded = false;
        this.$el.find(".wikibody").remove();
    };
    // HYPER.WikiPage.prototype.expand = function() {
    //     var that = this;
    //     if(this.expanded) {
    //         return;
    //     }
    //     this.expanded = true;

    //     this.fetch_raw(function(txt) {
    //         that.$el.append(
    //             $("<div>")
    //                 .addClass("wikibody")
    //                 .html(
    //                     make_paragraphs(
    //                         make_links(
    //                             remove_templates(txt)))));
    //     });
    // };
    HYPER.WikiPage.prototype.expand = function() {
        var that = this;
        this.fetch_raw(function(txt) {
            that.$el.append(HYPER.parse_wikitext(txt));
        });
    };
    HYPER.Book = function(spec) {
        this.spec = spec;
    };
    HYPER.Tree = function() {
    };

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
            else if(next_end > 0) {
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

    function templates(txt, onMatch, onFill) {
        return sweep_parse(txt, '{{', '}}', onMatch, onFill, 2, 2);
    };
    function wikilinks(txt) {
        return sweep_parse(txt, /\[\[/g, /\]\]/g, function(link) {
            if(link.indexOf("File:") >= 0) {
                return [];
            }
            var split = link.split('|');
            return $("<a>", {href: '/a/'+split[0]}).html(split[split.length-1]);
        }, identity, 2, 2);
    };

    function identity(x) { return x; }
    function wipe(x) { return ''; }

    HYPER.parse_wikitext = function(txt) {
        return paragraphs(txt, function(para) {
            return templates(para, wipe, wikilinks);
        });
    };

    // micro wiki-formatter.
    function remove_templates(txt) {
        var out = "";
        var cur_idx = 0;
        var end_idx = 0;
        var starts = [];
        while(true) {
            var next_start=txt.indexOf('{{', cur_idx);
            var next_end=txt.indexOf('}}', cur_idx);

            if(next_start < next_end && next_start >= 0) {
                starts.push(next_start);
                cur_idx = next_start + 1;
            }
            else if(next_end > 0) {
                var start = starts.pop();
                if(starts.length == 0) {
                    out += txt.slice(end_idx, start);
                    end_idx = next_end + 2;
                }
                cur_idx = next_end + 1;
            }
            else {
                out += txt.slice(end_idx);
                return out;
            }
        }
    }
    function make_links(txt) {
        // XXX: $2 with fallback to $1?
        // XXX: Normalize links?
        return txt.replace(/\[\[([^|\]]*)[^\]]*\]\]/g, "<a href='/a/$1'>$1</a>")
    }

    function make_paragraphs(txt) {
        return txt.replace(/\n([^\n]*)\n/g, "<p>$1</p>");
    }
})(HYPER);
