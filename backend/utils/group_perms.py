from django.contrib.auth.models import Group
from customuser.models import (
    CustomUser,
)
def user_in_group(user: CustomUser, group_name: str):
    try:
        group = Group.objects.get(name=group_name)
        return user.groups.filter(name=group_name).exists()
    except Group.DoesNotExist:
        return False
    except Exception:
        return False