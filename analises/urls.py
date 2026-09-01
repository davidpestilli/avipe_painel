from django.urls import path

from . import views


urlpatterns = [
    path("", views.api_lista_analises, name="api_lista_analises"),
    path("<int:registro_id>/", views.api_salvar_analise, name="api_salvar_analise"),
]
