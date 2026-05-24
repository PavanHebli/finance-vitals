#!/bin/bash
# Writes secrets.toml from Railway environment variables before starting Streamlit.
# On Streamlit Cloud this file is never called — secrets.toml is managed there directly.
mkdir -p .streamlit
cat > .streamlit/secrets.toml << EOF
SUPABASE_URL      = "${SUPABASE_URL}"
SUPABASE_KEY      = "${SUPABASE_KEY}"
HOSTED_API_KEY    = "${HOSTED_API_KEY}"
HOSTED_PROVIDER   = "${HOSTED_PROVIDER:-groq}"
SHOW_API_INPUT    = ${SHOW_API_INPUT:-false}
ENABLE_LOGGING    = ${ENABLE_LOGGING:-true}
DEBUG             = ${DEBUG:-false}
EOF
streamlit run app/main.py --server.port=${PORT:-8501} --server.address=0.0.0.0
