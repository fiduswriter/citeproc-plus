#!/usr/bin/env python3
from xml.dom import minidom
# By Johannes Wilm
# based on https://bitbucket.org/fbennett/citeproc-js/src/default/makejson.py
# by Frank Bennett
# See license info
# https://bitbucket.org/fbennett/citeproc-js/src/default/LICENSE

UNLISTED_STYLES = [] # styles that should not appear in user facing lists of styles but that are nevertheless valid


class XMLWalker:

    def __init__(self, xmlstring):
        dom = minidom.parseString(xmlstring).documentElement
        self.title_node = dom.getElementsByTagName("title")
        if len(self.title_node):
            self.title = self.title_node[0].firstChild.nodeValue
        else:
            self.title = ''
        lines = dom.getElementsByTagName("info")[0].toprettyxml().split('\n')
        self.license_info = '\n'.join([line for line in lines if line.strip()])
        self.output = self.walk_xml(dom)

    def walk_xml(self, elem):
        obj = {}
        obj["n"] = elem.nodeName
        if elem.attributes:
            for key in elem.attributes.keys():
                if key in ["xmlns", "href"]:
                    pass
                else:
                    if not "a" in obj:
                        obj["a"] = {}
                    obj["a"][key] = elem.attributes[key].value
        if len(elem.childNodes) > 0:
            obj["c"] = []
        for child in elem.childNodes:
            if child.nodeName == "#comment":
                pass
            elif child.nodeName == "info":
                # citeproc-js skips <info> entirely; keep it only for license text.
                pass
            elif child.nodeName == "#text":
                if (
                    len(elem.childNodes) == 1 and
                    elem.nodeName in ["term", "single", "multiple"]
                ):
                    obj["c"].append(child.wholeText)
            else:
                obj["c"].append(self.walk_xml(child))
        return obj


if __name__ == "__main__":
    import json
    import sys
    import os
    import shutil
    import gzip
    import base64

    dirs = ['./build/styles-master/', './src/extra_styles/']
    out_dir = './build/styles/'

    def write_compressed_json(data, path):
        """Write JSON data gzip-compressed and base64-encoded into a JSON wrapper."""
        compressed = gzip.compress(json.dumps(data, separators=(',', ':')).encode('utf-8'), compresslevel=9)
        encoded = base64.b64encode(compressed).decode('ascii')
        with open(path, 'w') as out_file:
            json.dump({'gz': encoded}, out_file, separators=(',', ':'))
    out_relative_path = './styles/'

    # Number of style chunks to emit. Fewer chunks give slightly better
    # compression and fewer HTTP requests; too few means loading a lot of
    # unused styles. 50 is a good balance for ~2800 styles.
    CHUNK_COUNT = 25

    license_txt = (
        'These styles are taken from '
        'https://github.com/citation-style-language/styles/\n'
        'The licenses of the individual styles are licenses as follows: \n\n'
    )
    styles_js_preamble = ''
    styles = {}
    styles_js_body = ''
    style_list = []
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)

    os.makedirs(out_dir)

    index = 0
    for dir in dirs:
        for filename in sorted(os.listdir(dir)):
            if filename.endswith(".csl"):
                id = filename[:-4]

                index += 1
                if index > CHUNK_COUNT:
                    index = 1
                js_id = 'c{:02d}'.format(index)
                walker = XMLWalker(open(os.path.join(dir, filename)).read())
                if not js_id in styles:
                    styles_js_preamble += 'import {} from "{}"\n'.format(
                        js_id,
                        os.path.join(out_relative_path, js_id + '.csljson')
                    )
                    styles[js_id] = {}
                styles[js_id][id] = walker.output
                styles_js_body += '    "{}": {},\n'.format(
                    id,
                    js_id
                )
                if not id in UNLISTED_STYLES:
                    title = walker.title.replace('\\', '\\\\').replace('"', '\\"')
                    style_list.append([
                        title,
                        '    "{}": "{}",\n'.format(
                            id,
                            title
                        )
                    ])
                license_txt += '{}\n'.format(id)
                license_txt += walker.license_info
                license_txt += '\n\n---\n\n'
    for style in styles.items():
        id = style[0]
        write_compressed_json(style[1], os.path.join(out_dir, id + '.csljson'))

    sorted_style_list = sorted(style_list, key=lambda k: k[0])
    styles_js_options = ''
    for style in sorted_style_list:
        styles_js_options += style[1]

    styles_js = (
        styles_js_preamble +
        '\nexport const styleLocations = {\n' +
        styles_js_body[:-2] +
        '\n}\n' +
        '\nexport const styles = {\n' +
        styles_js_options[:-2] +
        '\n}\n'
    )
    with open('build/styles.js', 'w') as out_file:
        out_file.write(styles_js)

    styles_dts = (
        'import type {CompressedChunk, SlimCSLNode} from "../src/types/csl"\n\n' +
        'export const styleLocations: Record<string, string | Record<string, SlimCSLNode> | CompressedChunk>\n' +
        'export const styles: Record<string, string>\n'
    )
    with open('build/styles.d.ts', 'w') as out_file:
        out_file.write(styles_dts)

    with open('style_licenses.txt', 'w') as out_file:
        out_file.write(license_txt)

    dir = './build/locales-master/'
    out_dir = './build/locales/'
    out_relative_path = './locales/'

    license_txt = (
        'These locales are taken from '
        'https://github.com/citation-style-language/locales\n'
        'The licenses of the individual locales are licenses as follows: \n\n'
    )
    locales_js_preamble = ''
    locales_js_body = ''

    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)

    os.makedirs(out_dir)

    for file in os.listdir(os.fsencode(dir)):
        filename = os.fsdecode(file)
        if filename.endswith(".xml"):
            id = filename[8:-4]
            js_id = id.replace('-', '_')
            walker = XMLWalker(open(os.path.join(dir, filename)).read())
            write_compressed_json(walker.output, os.path.join(out_dir, id + '.csljson'))
            locales_js_preamble += 'import {} from "{}"\n'.format(
                js_id,
                os.path.join(out_relative_path, id + '.csljson')
            )
            locales_js_body += '    "{}": {},\n'.format(
                id,
                js_id
            )
            license_txt += '{}\n'.format(id)
            license_txt += walker.license_info
            license_txt += '\n\n---\n\n'
    locales_js = (
        locales_js_preamble +
        '\nexport const locales = {\n' +
        locales_js_body[:-1] +
        '}'
    )
    with open('build/locales.js', 'w') as out_file:
        out_file.write(locales_js)

    locales_dts = (
        'import type {CompressedChunk, SlimCSLNode} from "../src/types/csl"\n\n' +
        'export const locales: Record<string, string | SlimCSLNode | CompressedChunk>\n'
    )
    with open('build/locales.d.ts', 'w') as out_file:
        out_file.write(locales_dts)

    with open('locale_licenses.txt', 'w') as out_file:
        out_file.write(license_txt)
