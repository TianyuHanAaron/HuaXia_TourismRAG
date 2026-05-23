"""Retrieved evidence reranking tool."""
import logging
import re

from huaxia_tourismrag.schemas.evidence import TravelChunk


logger = logging.getLogger(__name__)


class BgeRerankerTool:
    
    def __init__(self, model: object | None, max_model_candidates: int = 6) -> None:
        self.model = model
        self.max_model_candidates = max_model_candidates
        
    def rerank(self, question:str, chunks: list[TravelChunk], top_k:int) -> list[TravelChunk]:
        if not chunks:
            return []

        if self.model is None:
            return self._fallback_rerank(question, chunks, top_k)
        
        candidates = self._model_candidates(question, chunks)
        pairs = [[question, chunk.text] for chunk in candidates]
        try:
            raw_scores = self.model.compute_score(pairs, normalize=True)
        except Exception as exc:
            logger.warning("Reranker failed; falling back to retrieval scores: %s", exc)
            return self._fallback_rerank(question, chunks, top_k)

        scores = raw_scores if isinstance(raw_scores, list) else[raw_scores]
        scored: list[TravelChunk] = []
        for chunk, score in zip(candidates, scores):
            scored.append(chunk.model_copy(update={"rerank_score": score}))
        return sorted(scored, key= lambda c:c.rerank_score or 0, reverse=True)[:top_k]

    def _model_candidates(
        self,
        question: str,
        chunks: list[TravelChunk],
    ) -> list[TravelChunk]:
        if self.max_model_candidates <= 0 or len(chunks) <= self.max_model_candidates:
            return chunks

        return self._fallback_rerank(
            question,
            chunks,
            top_k=self.max_model_candidates,
        )

    def _fallback_rerank(
        self, question: str, chunks: list[TravelChunk], top_k: int
    ) -> list[TravelChunk]:
        scored = [
            chunk.model_copy(update={"rerank_score": self._fallback_score(question, chunk)})
            for chunk in chunks
        ]
        return sorted(scored, key=lambda c: c.rerank_score or 0, reverse=True)[:top_k]

    def _fallback_score(self, question: str, chunk: TravelChunk) -> float:
        relevance = self._lexical_relevance(
            question,
            f"{chunk.title}\n{chunk.location or ''}\n{chunk.text}",
        )
        retrieval_score = chunk.score or 0.0
        source_boost = 0.05 if chunk.source_type == "web" else 0.0

        return (0.75 * relevance) + (0.20 * retrieval_score) + source_boost

    def _lexical_relevance(self, query: str, text: str) -> float:
        query_terms = self._terms(query)
        if not query_terms:
            return 0.0

        text_terms = self._terms(text)
        if not text_terms:
            return 0.0

        return len(query_terms & text_terms) / len(query_terms)

    def _terms(self, text: str) -> set[str]:
        normalized = text.lower()
        terms = set(re.findall(r"[a-z0-9]+", normalized))
        cjk_chars = [
            char for char in normalized if "\u4e00" <= char <= "\u9fff"
        ]
        terms.update(
            "".join(cjk_chars[index : index + 2])
            for index in range(max(len(cjk_chars) - 1, 0))
        )
        terms.update(
            "".join(cjk_chars[index : index + 3])
            for index in range(max(len(cjk_chars) - 2, 0))
        )
        return {term for term in terms if term.strip()}
