from django.contrib.auth.backends import ModelBackend


class AuthpermsBackend(ModelBackend):
    """
    Password login, without Django's permission lookups.

    Those join permissions to content types and read user.groups, and neither
    exists on our own Permission and CustomUser models. Our permissions are
    checked by authperms.permissions, so here a non-superuser simply has no
    Django permissions; a superuser passes has_perm before reaching a backend.
    """

    def get_user_permissions(self, user_obj, obj=None):
        return set()

    def get_group_permissions(self, user_obj, obj=None):
        return set()
