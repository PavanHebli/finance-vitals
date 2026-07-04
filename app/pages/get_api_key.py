import streamlit as st

st.set_page_config(page_title="Get Your API Key — Vitals", page_icon="🔑", layout="wide", initial_sidebar_state="collapsed")

st.markdown(
    "<a href='/' target='_self' style='font-size:1.7rem; font-weight:700; color:var(--text-color); "
    "text-decoration:none; letter-spacing:-0.02em;'>🩺 Vitals</a>",
    unsafe_allow_html=True,
)
st.markdown("---")
st.title("🔑 Get Your API Key")
st.markdown("Vitals uses AI to generate your financial narrative. You bring your own API key — your data never touches our servers.")

st.markdown("---")

# Provider comparison table
st.markdown("### Which provider should I choose?")

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown("#### Groq")
    st.success("✅ Free tier available")
    st.markdown("""
- **Free tier:** Yes — no credit card
- **Model:** Llama 3.3 70B
- **Speed:** Fastest
- **Best for:** Getting started quickly
""")

with col2:
    st.markdown("#### Anthropic")
    st.info("💳 Paid")
    st.markdown("""
- **Free tier:** No — credit card required
- **Model:** Claude Opus 4.6
- **Cost:** ~$0.02–0.05 per use
- **Best for:** Highest quality narrative
""")

with col3:
    st.markdown("#### OpenAI")
    st.info("💳 Paid")
    st.markdown("""
- **Free tier:** No — credit card required
- **Model:** GPT-4o
- **Cost:** ~$0.01–0.03 per use
- **Best for:** Familiar with ChatGPT
""")

with col4:
    st.markdown("#### Gemini")
    st.success("✅ Free tier available")
    st.markdown("""
- **Free tier:** Yes — Google account only
- **Model:** Gemini 1.5 Flash
- **Cost:** Free within limits
- **Best for:** Google users
""")

st.markdown("---")

# Per-provider instructions
st.markdown("### Step-by-step instructions")

tab_groq, tab_anthropic, tab_openai, tab_gemini = st.tabs(["Groq", "Anthropic", "OpenAI", "Gemini"])

with tab_groq:
    st.markdown("#### Get a Groq API Key")
    st.markdown("Groq is the fastest way to get started — free tier, no credit card required.")
    st.markdown("""
1. Go to [console.groq.com](https://console.groq.com)
2. Click **Sign Up** — use your Google or GitHub account
3. Once logged in, click **API Keys** in the left sidebar
4. Click **Create API Key**
5. Give it a name (e.g. "Vitals"), then click **Submit**
6. Copy the key — it starts with `gsk_`
7. Paste it into Vitals's API Key field and select **Groq** as the provider
""")
    st.info("The free tier is generous enough for regular personal use. No billing setup required.")

with tab_anthropic:
    st.markdown("#### Get an Anthropic API Key")
    st.markdown("Anthropic's Claude produces the highest quality narrative responses.")
    st.markdown("""
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click **Sign Up** and create an account
3. Add a credit card under **Billing** — you'll only be charged for what you use
4. Add at least **$5 in credits** (minimum top-up)
5. Go to **Settings → API Keys**
6. Click **Create Key**, give it a name, and copy it
7. The key starts with `sk-ant-`
8. Paste it into Vitals and select **Anthropic** as the provider
""")
    st.info("Each Vitals session costs roughly $0.02–0.05. $5 in credits = ~100–250 sessions.")

with tab_openai:
    st.markdown("#### Get an OpenAI API Key")
    st.markdown("OpenAI's GPT-4o is a reliable, well-rounded option.")
    st.markdown("""
1. Go to [platform.openai.com](https://platform.openai.com)
2. Click **Sign Up** or **Log In**
3. Go to **Settings → Billing** and add a credit card
4. Add at least **$5 in credits**
5. Go to **Dashboard → API Keys**
6. Click **Create new secret key**, name it, and copy it immediately — it won't be shown again
7. The key starts with `sk-`
8. Paste it into Vitals and select **OpenAI** as the provider
""")
    st.warning("Save your key immediately after creation — OpenAI only shows it once.")

with tab_gemini:
    st.markdown("#### Get a Gemini API Key")
    st.markdown("Gemini offers a free tier through Google AI Studio — no billing required.")
    st.markdown("""
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your **Google account**
3. Click **Get API Key** in the left sidebar
4. Click **Create API key in new project**
5. Copy the key shown
6. Paste it into Vitals and select **Gemini** as the provider
""")
    st.info("Google AI Studio's free tier is sufficient for personal use with no credit card required.")

st.markdown("---")

st.markdown("### Common questions")

with st.expander("Is my API key stored anywhere?"):
    st.markdown(
        "No. Your API key is held in your browser session only and is never sent to or stored by Vitals. "
        "It goes directly from your browser to the AI provider's API. "
        "You can verify this by reviewing the open-source code on GitHub."
    )

with st.expander("What does 'per use' mean?"):
    st.markdown(
        "Each time you click 'Show me my financial picture', Vitals sends your financial data to the AI provider "
        "and streams back the narrative. That single exchange is one 'use'. "
        "The cost is based on the number of tokens (words) in the request and response — typically under $0.05."
    )

with st.expander("Can I use the free tiers for regular use?"):
    st.markdown(
        "Yes. Groq and Gemini both have free tiers that are sufficient for personal monthly use. "
        "If you're using Vitals once a month to check in on your finances, free tiers will cover it."
    )

with st.expander("What if my key stops working?"):
    st.markdown(
        "Common reasons: \n"
        "- **Ran out of credits** — top up your balance in the provider's billing settings\n"
        "- **Expired or deleted key** — generate a new one following the steps above\n"
        "- **Rate limit hit** — wait a few minutes and try again\n\n"
        "The error message from Vitals will usually tell you which one it is."
    )
