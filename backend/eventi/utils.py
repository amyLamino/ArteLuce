# (chemin : /backend/eventi/utils.py)
from datetime import datetime
def next_external_id(model, prefix: str) -> str:
    year = datetime.now().year
    count = model.objects.filter(external_id__startswith=f"{prefix}-{year}-").count() + 1
    return f"{prefix}-{year}-{count:04d}"
