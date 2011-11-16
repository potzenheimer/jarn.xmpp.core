import re
from urlparse import urlparse

from zope.component import getUtility

from Products.CMFCore.utils import getToolByName
from Products.Five.browser import BrowserView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile

from jarn.xmpp.core.interfaces import IPubSubStorage


class PubSubFeedMixIn(object):

    def __init__(self, context):
        self.storage = getUtility(IPubSubStorage)
        if self.node in self.storage.leaf_nodes:
            self.nodeType = 'leaf'
        else:
            self.nodeType = 'collection'
        self.mt = getToolByName(self.context, 'portal_membership')

    def fullname(self, author):
        member = self.mt.getMemberById(author)
        return member.getProperty('fullname', None)

    def canPublish(self):
        """
        Checks whether the user can publish in this node. If it's a leaf
        node check whether the user is in the publishers. If it's a collection
        node check if there is a unique node for this collection where the
        user has publisher rights.
        """

        if self.mt.isAnonymousUser() or self.node is None:
            return
        user_id = self.mt.getAuthenticatedMember().id
        if self.nodeType == 'leaf':
            if user_id in self.storage.publishers[self.node]:
                return self.node
        else:
            publisher_nodes = [node
                               for node in self.storage.collections[self.node]
                               if user_id in self.storage.publishers[node]]
            if len(publisher_nodes) == 1:
                return publisher_nodes[0]

    def items(self, node=None, count=100):
        if node is None:
            node = self.node
        return self.storage.itemsFromNodes([node], count)


class PubSubFeed(BrowserView, PubSubFeedMixIn):

    def __init__(self, context, request):
        BrowserView.__init__(self, context, request)
        self.node = request.get('node', None)
        PubSubFeedMixIn.__init__(self, context)


class PubSubItem(BrowserView):

    item_template = ViewPageTemplateFile("pubsub_item.pt")

    def fullname(self, author):
        member = self.mt.getMemberById(author)
        return member.getProperty('fullname', None)

    def isLeaf(self):
        return self._isLeaf

    def __call__(self, item=None, isLeaf=True):
        if item is None:
            item = {
                'node': self.request.get('node'),
                'id': self.request.get('id'),
                'content': self.request.get('content'),
                'author': self.request.get('author'),
                'published': self.request.get('published'),
                'updated': self.request.get('updated'),
            }
            if ('geolocation[latitude]' in self.request and
                'geolocation[longitude]' in self.request):
                item['geolocation'] = {
                    'latitude': self.request.get('geolocation[latitude]'),
                    'longitude': self.request.get('geolocation[longitude]')}
            if self.request.get('isLeaf') == 'false':
                isLeaf = False
        self.item = item
        self.isLeaf = isLeaf
        self.mt = getToolByName(self.context, 'portal_membership')

        # Calculate magic links
        portal_url_netloc = urlparse(
            getToolByName(self.context, 'portal_url')()).netloc
        urls = re.findall(r'href=[\'"]?([^\'" >]+)', item['content'])
        self.item['urls'] = [url
                             for url in urls
                             if url.startswith('http')
                             and urlparse(url).netloc != portal_url_netloc]
        return self.item_template()
