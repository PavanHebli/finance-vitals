"""
Account deletion. Two-step, both required:

1. Verify the caller's own access token with the ANON client — this proves
   "you are who your token says you are" without granting any elevated
   access. Never trust a user_id passed directly in the request body; that
   would let anyone delete anyone else's account.
2. Delete via the SERVICE-ROLE client — the only client with permission to
   remove a row from auth.users at all. This key never leaves the server.
"""
from __future__ import annotations


def delete_account(access_token: str, supabase_url: str, anon_key: str, service_role_key: str) -> bool:
    if not access_token or not supabase_url or not anon_key or not service_role_key:
        return False

    from supabase import create_client

    anon_client = create_client(supabase_url, anon_key)
    user_resp = anon_client.auth.get_user(access_token)
    if not user_resp or not user_resp.user:
        return False

    user_id = user_resp.user.id

    admin_client = create_client(supabase_url, service_role_key)
    admin_client.auth.admin.delete_user(user_id)
    return True
