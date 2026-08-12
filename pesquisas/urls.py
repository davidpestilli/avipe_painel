from django.urls import path

from . import legacy_views
from . import views

app_name = "pesquisas"

urlpatterns = [
    path("health/", views.health, name="health"),
    path("api/dashboard/", views.api_dashboard, name="api_dashboard"),
    path("api/pesquisas/", views.api_lista_pesquisas, name="api_lista"),
    path("api/pesquisas/detalhe/", views.api_detalhe_pesquisa, name="api_detalhe"),
    path("", views.react_app, name="dashboard"),
    path("pesquisas/", views.react_app, name="lista"),
    path("pesquisas/detalhe/", views.react_app, name="detalhe"),
    path("legado/", legacy_views.dashboard, name="legacy_dashboard"),
    path("legado/pesquisas/", legacy_views.lista_pesquisas, name="legacy_lista"),
    path("legado/pesquisas/detalhe/", legacy_views.detalhe_pesquisa, name="legacy_detalhe"),
]
