from django.urls import path

from . import views

app_name = "pesquisas"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("pesquisas/", views.lista_pesquisas, name="lista"),
    path("pesquisas/detalhe/", views.detalhe_pesquisa, name="detalhe"),
]
