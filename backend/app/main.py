from fastapi import FastAPI

from config import add_cors_middleware
from api.data.file_uploader import router as file_uploader_router
from api.data_source import router as data_source_router
from api.data.database.connection import router as connection_router
from api.column_information import router as column_information_router
from api.data.chart_data_generation import router as chart_data_generation_router
from api.data.data_table import router as table_data_router
from api.data.data_cleaning import router as data_cleaning_router
from api.data.database.postgres_helper import router as postgres_info_router
from api.data.database.postgres_table import router as postgres_table_router
from api.modeling.prediction.ml_model_predictor import (
    router as ml_model_predictor_router,
)
from api.modeling.optimization.optimizer import router as optimizer_router


from api.dashboard.llm_engine.dashboardgeneration import (
    router as dashboardgeneration_router,
)

from api.dashboard.chat_history.chathistory import router as chathistory_router
from api.settings.api_ping import router as settings_router
from api.settings.fetch_settings import router as fetch_models_router

from utils.prediction.ml_models.xg_boost.prediction_assistant import (
    router as predictor_assistant_router,
)

from utils.optimization.optimizer_assistant import (
    router as optimization_assistant_router,
)

from utils.prediction.ml_models.xg_boost.correlation import router as correlation_router


app = FastAPI()
add_cors_middleware(app)

app.include_router(file_uploader_router, prefix="/data")
app.include_router(data_source_router, prefix="/data_sources_info")
app.include_router(connection_router, prefix="/data")
app.include_router(column_information_router, prefix="/columns")
app.include_router(chart_data_generation_router, prefix="/data")
app.include_router(table_data_router, prefix="/data")
app.include_router(data_cleaning_router, prefix="/data")
app.include_router(postgres_info_router, prefix="/data")
app.include_router(postgres_table_router, prefix="/data")
app.include_router(ml_model_predictor_router, prefix="/predictor")
app.include_router(optimizer_router, prefix="/optimizer")
app.include_router(dashboardgeneration_router)
app.include_router(chathistory_router, prefix="/chats")
app.include_router(settings_router, prefix="/settings")
app.include_router(fetch_models_router, prefix="/settings")
app.include_router(predictor_assistant_router, prefix="/predictor")
app.include_router(optimization_assistant_router, prefix="/optimizer")
app.include_router(correlation_router, prefix="/predictor")
