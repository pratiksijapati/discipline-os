class OwnedQuerysetMixin:
    """
    Use on every view/viewset whose model has a `user` foreign key.

    - Reads only ever see the logged-in user's rows, so requesting another
      user's record by id returns 404 (we don't even reveal that it exists).
    - Creates always attach the logged-in user; the client can't choose `user`.
    """

    owner_field = "user"

    def get_queryset(self):
        return super().get_queryset().filter(**{self.owner_field: self.request.user})

    def perform_create(self, serializer):
        serializer.save(**{self.owner_field: self.request.user})
