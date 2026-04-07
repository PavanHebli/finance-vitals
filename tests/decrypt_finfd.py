#!/usr/bin/env python3
"""
Decrypt and inspect a .fin snapshot file.

Usage:
    python tests/decrypt_finfd.py path/to/my_finances.fin
    python tests/decrypt_finfd.py path/to/my_finances.fin --full
"""

import sys
import json
import base64

from cryptography.fernet import Fernet

_RAW_KEY    = b'finfriend_secret_key_v1_2026_!!!'
_FERNET_KEY = base64.urlsafe_b64encode(_RAW_KEY)
_cipher     = Fernet(_FERNET_KEY)


def main():
    if len(sys.argv) < 2:
        print("Usage: python tests/decrypt_finfd.py <file.finfd> [--full]")
        sys.exit(1)

    path     = sys.argv[1]
    show_all = "--full" in sys.argv

    with open(path, "rb") as f:
        encrypted = f.read()

    try:
        json_str = _cipher.decrypt(encrypted).decode("utf-8")
    except Exception:
        print("ERROR: Could not decrypt. Is this a valid .finfd file?")
        sys.exit(1)

    data = json.loads(json_str)
    if isinstance(data, dict):
        data = [data]

    print(f"\n{'='*50}")
    print(f"  FinFriend Snapshot — {len(data)} entry/entries")
    print(f"{'='*50}\n")

    for i, snap in enumerate(data):
        out     = snap["outputs"]
        inputs  = snap["inputs"]
        metrics = out["metrics"]

        print(f"[{i + 1}] {snap['saved_at']}  —  Score: {out['overall_score']}/100 ({out['mirror_label']})")
        print(f"    Savings Rate:    {metrics['savings_rate']}%")
        print(f"    Debt-to-Income:  {metrics['debt_to_income']}%")
        print(f"    Emergency Fund:  {metrics['emergency_fund_months']} months")
        print(f"    Housing Ratio:   {metrics['housing_ratio']}%")
        print(f"    Net Flow:        ${metrics['net_monthly_flow']:,.2f}")

        if show_all:
            print(f"\n    --- Inputs ---")
            for k, v in inputs.items():
                print(f"    {k}: {v}")
            if out.get("narrative"):
                print(f"\n    --- Narrative ---")
                print(f"    {out['narrative'][:300]}{'...' if len(out['narrative']) > 300 else ''}")

        print()

    if not show_all:
        print("Tip: run with --full to see all inputs and narrative text.\n")


if __name__ == "__main__":
    main()
