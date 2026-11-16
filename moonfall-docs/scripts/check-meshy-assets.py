"""Inspect actual GLB files only. --require-complete requires every scoped asset.
No API requests, generated fixtures, or credentials are involved.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('import_meshy', ROOT/'scripts/import-meshy.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def inspect(path):
    validated = importer.validate(path)
    binary = path.read_bytes()
    count = int.from_bytes(binary[12:16], 'little')
    data = json.loads(binary[20:20+count])
    triangles = 0
    for mesh in data['meshes']:
        for primitive in mesh['primitives']:
            if primitive.get('mode', 4) != 4:
                raise ValueError('Only triangle primitives supported')
            accessor = primitive.get('indices', primitive['attributes']['POSITION'])
            triangles += data['accessors'][accessor]['count']//3
    return {**validated, 'sha256':hashlib.sha256(binary).hexdigest(),
            'meshes':len(data['meshes']), 'triangles':triangles,
            'materials':len(data.get('materials', [])), 'textures':len(data.get('textures', [])),
            'bones':len({i for skin in data.get('skins', []) for i in skin['joints']})}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-complete',action='store_true')
    parser.add_argument('--scope',choices=['phase12','biome','all'],default='phase12')
    args=parser.parse_args()
    manifest=json.loads((ROOT/'assets/meshy/manifest.json').read_text())
    reports=[]
    for key,asset in manifest['assets'].items():
        biome=asset.get('biome')=='moonfall'
        if args.scope=='phase12' and biome or args.scope=='biome' and not biome:
            continue
        path=ROOT/asset['url']
        r={'asset':key,'taskId':asset['taskId'],'phase':'biome' if biome else asset.get('phase',1),
           'taskStatus':asset.get('verifiedTaskStatus','unknown'),'file':asset['url'],'glbDownloaded':path.is_file()}
        if path.is_file():
            r.update(inspect(path));r['inspected']=True
        else:
            r.update(inspected=False,blocker='GLB file absent; download/import required')
        reports.append(r)
        print(json.dumps(r,ensure_ascii=False))
    report={'assets':reports,'downloaded':sum(r['glbDownloaded'] for r in reports),'total':len(reports),
            'complete':all(r.get('inspected') for r in reports),'paidToolCalls':0}
    target={'phase12':'phase12-assets.json','biome':'biome-assets.json','all':'all-assets.json'}[args.scope]
    (ROOT/'reports'/target).write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    if args.require_complete and not report['complete']:
        raise SystemExit('INCOMPLETE: actual GLB files missing; task success is not a downloaded asset')


if __name__=='__main__':
    main()
