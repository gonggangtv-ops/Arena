"""Validate local Meshy exports and update the manifest; never fabricates GLBs.

python3 scripts/import-meshy.py --source /path/to/exports
python3 scripts/import-meshy.py --scan
Source names must match the manifest (moon-arena.glb etc.). No API key needed.
"""
import argparse
import json
from pathlib import Path
import shutil
import struct

ROOT = Path(__file__).resolve().parents[1]


def validate(path):
    size = path.stat().st_size
    if size > 64 * 1024 * 1024:
        raise ValueError("exceeds 64 MiB; optimize first")
    with path.open("rb") as f:
        header = f.read(20)
        if len(header) != 20:
            raise ValueError("truncated GLB")
        magic, version, length, json_size, chunk = struct.unpack("<5I", header)
        if (magic, version, length, chunk) != (0x46546C67, 2, size, 0x4E4F534A):
            raise ValueError("invalid GLB 2.0 header")
        if json_size > size - 20:
            raise ValueError("truncated JSON chunk")
        data = json.loads(f.read(json_size))
        if any(a.get("uri") and not a["uri"].startswith("data:")
               for a in data.get("images", []) + data.get("buffers", [])):
            raise ValueError("export must embed all textures and buffers")
        if data.get("asset", {}).get("version") != "2.0" or not data.get("meshes"):
            raise ValueError("requires glTF 2.0 meshes")
    return {"bytes": size, "skins": len(data.get("skins", [])),
            "animations": [a.get("name", "unnamed") for a in data.get("animations", [])]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--source", type=Path)
    group.add_argument("--scan", action="store_true")
    args = parser.parse_args()
    manifest_path = ROOT / "assets/meshy/manifest.json"
    manifest = json.loads(manifest_path.read_text())
    # Validate the full batch before mutating anything.
    imports = []
    for key, asset in manifest["assets"].items():
        target = ROOT / asset["url"]
        candidate = args.source / target.name if args.source else target
        if candidate.is_file():
            report = validate(candidate)
            imports.append((candidate, target))
            asset["available"] = True
            print(f"VALID {key}: {report}")
        else:
            # A partial source import preserves already imported files.
            asset["available"] = bool(args.source and target.is_file())
            if asset["available"]:
                validate(target)
            print(f"{'KEEP' if asset['available'] else 'MISSING'} {target.name} ({asset['taskId']})")
    for source, target in imports:
        if source.resolve() != target.resolve():
            temporary = target.with_suffix(".glb.tmp")
            shutil.copyfile(source, temporary)
            temporary.replace(target)
    temporary = manifest_path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(manifest, indent=2) + "\n")
    temporary.replace(manifest_path)
    print("Manifest updated. Reload the game; the browser also checks geometry/texture budgets and rig readiness.")


if __name__ == "__main__":
    main()
