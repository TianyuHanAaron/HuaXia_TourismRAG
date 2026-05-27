"""Worker for queued long-running travel jobs."""

import logging
from collections.abc import Callable

from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.job_queue import TravelJobQueue
from huaxia_tourismrag.services.job_store import TravelJobNotFoundError, TravelJobStore

logger = logging.getLogger(__name__)


class TravelJobWorker:
    """Process queued DIY itinerary jobs outside the API request path."""

    def __init__(
        self,
        job_store: TravelJobStore,
        job_queue: TravelJobQueue,
        diy_service_factory: Callable[[str], DIYItineraryService],
    ) -> None:
        self.job_store = job_store
        self.job_queue = job_queue
        self.diy_service_factory = diy_service_factory

    async def run_once(self, timeout_seconds: int = 5) -> bool:
        item = await self.job_queue.dequeue(timeout_seconds=timeout_seconds)
        if item is None:
            return False

        try:
            job = await self.job_store.get(item.job_id, item.tenant_id)
        except TravelJobNotFoundError:
            logger.warning("Queued travel job not found: %s", item.job_id)
            return True

        await self.job_store.mark_running(item.job_id, item.tenant_id)
        service = self.diy_service_factory(item.tenant_id)
        try:
            answer = await service.answer(job.question)
        except Exception as exc:
            await self.job_store.fail(item.job_id, item.tenant_id, str(exc))
            return True

        await self.job_store.complete(item.job_id, item.tenant_id, answer)
        return True
