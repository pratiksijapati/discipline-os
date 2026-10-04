from django.utils import timezone


class CompletionStampMixin:
    """
    Keeps `completed_at` in sync with `status` for models that can be completed.
    Call self.stamp_completion(attrs) from validate().
    """

    completed_status = "completed"

    def stamp_completion(self, attrs):
        if "status" not in attrs:
            return attrs
        instance = getattr(self, "instance", None)
        if attrs["status"] == self.completed_status:
            if instance is None or instance.status != self.completed_status:
                attrs["completed_at"] = timezone.now()
        else:
            attrs["completed_at"] = None
        return attrs


def check_time_range(start, end, field="end_time"):
    """Returns an error dict if end is not after start, else None."""
    if start and end and end <= start:
        return {field: ["End time must be after the start time."]}
    return None
