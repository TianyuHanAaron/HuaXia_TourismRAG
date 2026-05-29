from huaxia_tourismrag.services.provider_budget import ProviderBudget, ProviderCooldown


def test_provider_budget_caps_calls_per_provider():
    budget = ProviderBudget({"tavily": 2})

    assert budget.consume("tavily")
    assert budget.consume("tavily")
    assert not budget.consume("tavily")
    assert budget.remaining("tavily") == 0
    assert budget.consume("firecrawl")


def test_provider_cooldown_blocks_until_elapsed():
    now = 100.0

    def clock() -> float:
        return now

    cooldown = ProviderCooldown(cooldown_seconds=30, clock=clock)

    assert cooldown.is_available("tavily")
    cooldown.mark_failure("tavily")
    assert not cooldown.is_available("tavily")
    now = 131.0
    assert cooldown.is_available("tavily")
