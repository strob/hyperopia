#!/usr/bin/python

import bz2
import sys

import cdb

def progress(i, n=10000):
    i = iter(i)

    while True:
        try:
            for _i in xrange(10000):
                i.next()

            sys.stdout.write('.')
            sys.stdout.flush()
        except StopIteration:
            print
            return

def make_indices(path):
    f = bz2.BZ2File(path.replace('.xml.bz2', '-index.txt.bz2'))
    id_path = '%s.ids' % path
    title_path = '%s.titles' % path
    offset_path = '%s.offsets' % path
    id_db = cdb.cdbmake(id_path, id_path + '.tmp')
    title_db = cdb.cdbmake(title_path, title_path + '.tmp')
    offset_db = cdb.cdbmake(offset_path, offset_path + '.tmp')

    def build():
        for line in f:
            (bytes, id, title) = line[:-1].split(':', 2)
            id_db.add(id, title)
            title_db.add(title, id)
            offset_db.add(id, bytes)
            yield

    progress(build())
    id_db.finish()
    title_db.finish()
    offset_db.finish()

def main():
    path = sys.argv[1]
    make_indices(path)

if __name__ == '__main__':
    main()
