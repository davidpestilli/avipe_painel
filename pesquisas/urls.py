from django.urls import path

from . import views

app_name = "pesquisas"

urlpatterns = [
    path("health/", views.health, name="health"),
    path("api/dashboard/", views.api_dashboard, name="api_dashboard"),
    path("api/configuracoes/", views.api_configuracoes, name="api_configuracoes"),
    path("api/observabilidade/", views.api_observabilidade, name="api_observabilidade"),
    path("api/pesquisas/", views.api_lista_pesquisas, name="api_lista"),
    path("api/pesquisas/exportar/", views.api_exportar_pesquisas, name="api_exportar"),
    path("api/pesquisas/detalhe/", views.api_detalhe_pesquisa, name="api_detalhe"),
    path("", views.react_app, name="dashboard"),
    path("home/", views.react_app, name="home"),
    path("pesquisas/", views.react_app, name="lista"),
    path("pesquisas/detalhe/", views.react_app, name="detalhe"),
    path("configuracoes/", views.react_app, name="configuracoes"),
]
