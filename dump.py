
import bz2

import cdb
import lxml.etree as etree

def get_pages_at(dump, offset):
    decomp = bz2.BZ2Decompressor()
    dump.seek(offset)
    builder = etree.TreeBuilder()
    p = etree.XMLParser(target=builder)
    p.feed('<mediawiki>')

    while True:
        s = dump.read(1024)

        try:
            s = decomp.decompress(s)
        except EOFError:
            p.feed('</mediawiki>')
            p.close()
            break

        p.feed(s)

    return builder.close()

class Dump(object):
    def __init__(self, path):
        self.dump = file(path)
        self.id_db = cdb.init(path + '.ids')
        self.title_db = cdb.init(path + '.titles')
        self.offset_db = cdb.init(path + '.offsets')

    def get_by_id(self, id):
        offset = self.offset_db.get(id)

        if offset is None:
            raise KeyError

        offset = int(offset)

        # This one seems fixed...
        # def wtf(offset):
        #     # Looks like the offset index has integer overflow problems.

        #     for i in xrange(10):
        #         try:
        #             return get_pages_at(self.dump, offset)
        #         except IOError, e:
        #             offset += 2 ** 32
        #     raise e

        try:
            # tree = wtf(offset)
            tree = get_pages_at(self.dump, offset)
        except IOError, e:
            print e
            raise KeyError

        for page in tree.findall('page'):
            if page.findtext('id') == id:
                return page

        # This shouldn't happen.
        raise KeyError

    def get_by_title(self, title):
        id = self.title_db.get(title)

        if id is None:
            # Article not found.
            raise KeyError

        return self.get_by_id(id)
