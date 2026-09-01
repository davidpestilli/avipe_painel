from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("api/analises/", include("analises.urls")),
    path("", include("pesquisas.urls")),
    path("admin/", admin.site.urls),
]
