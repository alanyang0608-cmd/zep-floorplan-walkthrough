#!/usr/bin/env python3
"""Package a staged offline walkthrough and optionally round-trip its Python build."""
import argparse
import filecmp
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile


def staged_file(stage, argument):
    relative = Path(argument)
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError(f'请填写暂存目录内的相对路径：{argument}')
    file = stage / relative
    if not file.is_file():
        raise ValueError(f'暂存目录内找不到文件：{relative}')
    return relative


def package(stage, output, entry, rebuild):
    stage = stage.resolve(strict=True)
    if not stage.is_dir():
        raise ValueError(f'暂存目录无效：{stage}')
    output = output.parent.resolve() / output.name
    if output.suffix.lower() != '.zip':
        raise ValueError('输出文件请使用 .zip 后缀')
    entry = staged_file(stage, entry)
    if entry.suffix.lower() not in ('.html', '.htm'):
        raise ValueError(f'指定的入口应为 HTML：{entry}')
    builder = staged_file(stage, rebuild) if rebuild else None

    skip = {'.git', '.DS_Store', '__pycache__', '__MACOSX'}
    files = []
    for file in sorted(stage.rglob('*')):
        relative = file.relative_to(stage)
        if set(relative.parts) & skip or file == output:
            continue
        if file.is_symlink():
            raise ValueError(f'请把链接目标作为文件复制进交付暂存目录：{relative}')
        if file.is_file():
            files.append(relative)

    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix='walkthrough-', dir=output.parent) as scratch:
        work = Path(scratch)
        archive = work / 'bundle.zip'
        with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=7) as bundle:
            for relative in files:
                bundle.write(stage / relative, relative.as_posix())
        unpacked = work / 'opened'
        with ZipFile(archive) as bundle:
            bad_file = bundle.testzip()
            if bad_file is not None:
                raise ValueError(f'压缩数据校验失败：{bad_file}')
            bundle.extractall(unpacked)
        if not filecmp.cmp(stage / entry, unpacked / entry, shallow=False):
            raise ValueError('解压后的 HTML 与暂存入口不一致')
        if builder:
            rebuilt = work / 'rebuilt.html'
            script = unpacked / builder
            subprocess.run([sys.executable, str(script), str(rebuilt)], cwd=script.parent, check=True)
            if not rebuilt.is_file() or not filecmp.cmp(unpacked / entry, rebuilt, shallow=False):
                raise ValueError('源码重建结果与交付入口不一致，请核对构建输入及版本')
        archive.replace(output)
    checked = '，已从包内源码重建相同网页' if builder else ''
    print(f'{output}（{len(files)} 个文件，解压校验通过{checked}）')


def main():
    parser = argparse.ArgumentParser(description='打包干净的住宅漫游暂存目录，验证解压后的入口。')
    parser.add_argument('stage', type=Path, help='仅含本次网页、源码、资源与预览的暂存目录')
    parser.add_argument('output', type=Path, help='输出 ZIP 的文件路径')
    parser.add_argument('--entry', required=True, help='HTML 入口，相对暂存目录')
    parser.add_argument('--rebuild', help='可选。包内受信任的 Python 构建脚本，接受一个输出 HTML 路径')
    args = parser.parse_args()
    try:
        package(args.stage, args.output, args.entry, args.rebuild)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'未生成新压缩包。{error}\n')


if __name__ == '__main__':
    main()
