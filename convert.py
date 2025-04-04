#!/usr/bin/env python3
from xml.dom import minidom
from string import ascii_lowercase
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

    dirs = ['./build/styles-master/', './src/extra_styles/']
    out_dir = './build/styles/'
    out_relative_path = './styles/'

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
        for file in os.listdir(os.fsencode(dir)):
            filename = os.fsdecode(file)
            if filename.endswith(".csl"):
                id = filename[:-4]

                index += 1
                if index > 200:
                    index = 1
                js_id = (
                    ascii_lowercase[index // 26] +
                    ascii_lowercase[index % 26]
                )
                if js_id == "do":
                    js_id = "aa"
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
        with open(os.path.join(out_dir, id + '.csljson'), 'w') as out_file:
            json.dump(style[1], out_file)

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
            out_file = open(os.path.join(out_dir, id + '.csljson'), 'w')
            json.dump(walker.output, out_file)
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

    with open('locale_licenses.txt', 'w') as out_file:
        out_file.write(license_txt)
