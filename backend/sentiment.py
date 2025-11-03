from transformers import pipeline

_sentiment_pipeline = None

def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        _sentiment_pipeline = pipeline( # type: ignore
            task="sentiment-analysis", # type: ignore
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
        ) 
    return _sentiment_pipeline

def score_text(text: str) -> float:
    pipe = get_sentiment_pipeline()
    result = pipe(text[:512])[0]
    return result["score"] if result["label"] == "POSITIVE" else -result["score"]
