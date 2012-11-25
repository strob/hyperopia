
import lxml.etree as etree
import sys

from twisted.internet import reactor
from twisted.web import resource, server, static

import dump

class Articles(resource.Resource):
    def __init__(self, dump):
        resource.Resource.__init__(self)
        self.dump = dump

    def getChild(self, name, req):
        try:
            node = self.dump.get_by_title(name)
        except KeyError:
            try:
                name = name[0].capitalize() + name[1:]
                node = self.dump.get_by_title(name)
            except KeyError:
                return resource.NoResource()

        return self.makeChild(name, node)

class ArticlesRaw(Articles):
    def makeChild(self, name, node):
        s = node.find('revision/text').text
        return static.Data(s.encode('utf8'), 'text/plain')

class ArticlesXML(Articles):
    def makeChild(self, name, node):
        s = etree.tostring(node)
        return static.Data(s, 'text/xml')

class ArticlesFormatted(Articles):
    def getChild(self, name, req):
        return static.File('skeleton.html')

class Site(server.Site):
    def __init__(self, dump):
        root = resource.Resource()
        server.Site.__init__(self, root)

        root.putChild('xml', ArticlesXML(dump))
        root.putChild('raw', ArticlesRaw(dump))
        root.putChild('a', ArticlesFormatted(dump))
        root.putChild('jquery.js', static.File('jquery.js'))
        root.putChild('hyper.js', static.File('hyper.js'))
        root.putChild('hyper.css', static.File('hyper.css'))

def main():
    (dump_path,) = sys.argv[1:]
    site = Site(dump.Dump(dump_path))
    reactor.listenTCP(8080, site)
    reactor.run()

if __name__ == '__main__':
    main()
