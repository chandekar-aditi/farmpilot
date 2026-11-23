"""
Groq LLM service — recommendation explanations and chat completions.
"""
from groq import Groq
from backend.core.config import settings

_client = None

def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def get_recommendation_explanation(user_experience, user_goals, user_budget,
                                   user_space, crop_name, kit_count,
                                   setup_cost, cycle_cost, expected_yield, cycle_days) -> str:
    if not settings.GROQ_API_KEY:
        return f"{crop_name} is a great match for your {user_experience} level and ₹{user_budget:,.0f} budget."
    prompt = (
        f"You are FarmPilot AI, a friendly hydroponic farming advisor.\n"
        f"Explain in exactly 2-3 sentences why {crop_name} is recommended for this user:\n"
        f"- Experience: {user_experience}\n"
        f"- Goals: {', '.join(user_goals)}\n"
        f"- Space: {user_space} sq ft, Budget: ₹{user_budget:,.0f}\n"
        f"- {kit_count} kits, setup ₹{setup_cost:,.0f}, cycle ₹{cycle_cost:,.0f}\n"
        f"- Expected: {expected_yield} kg in {cycle_days} days\n"
        f"Be specific and encouraging. Plain text only, no bullets."
    )
    try:
        r = _get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120, temperature=0.7,
        )
        return r.choices[0].message.content.strip()
    except Exception:
        return f"{crop_name} suits your {user_experience} level well and fits your ₹{user_budget:,.0f} budget."


def chat_completion(system_prompt: str, messages: list) -> str:
    if not settings.GROQ_API_KEY:
        return "FarmPilot bot is not configured yet. Please add GROQ_API_KEY to .env file."
    try:
        all_msgs = [{"role": "system", "content": system_prompt}] + messages
        r = _get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=all_msgs, max_tokens=512, temperature=0.6,
        )
        return r.choices[0].message.content.strip()
    except Exception as e:
        return f"I encountered an error: {str(e)}. Please try again."
