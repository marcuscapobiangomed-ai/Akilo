
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import date, datetime
from uuid import UUID

# Unit Types
UnitType = Literal['g', 'ml', 'serving']
MealType = Literal['breakfast', 'lunch', 'snacks', 'dinner']
FoodSource = Literal['master', 'custom', 'manual']
ActivityLevel = Literal['low', 'medium', 'high']
GoalType = Literal['maintain', 'fat_loss', 'muscle_gain']

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    sex: Optional[Literal['male', 'female']] = 'male'
    activity_level: Optional[ActivityLevel] = None
    goal_type: Optional[GoalType] = None
    avatar_mascot_id: Optional[Literal['tita', 'gaia']] = None
    waist_cm: Optional[float] = None
    body_fat_pct: Optional[float] = None
    muscle_mass_pct: Optional[float] = None
    body_water_pct: Optional[float] = None
    basal_metabolism_kcal: Optional[int] = None
    metabolic_age: Optional[int] = None
    checkin_frequency_days: Optional[int] = None
    initial_weight_kg: Optional[float] = None
    initial_body_fat_pct: Optional[float] = None
    initial_waist_cm: Optional[float] = None
    initial_muscle_mass_pct: Optional[float] = None
    avatar_customization: Optional[dict] = None

class TargetUpdate(BaseModel):
    calories_target: Optional[int] = None
    protein_target_g: Optional[int] = None
    carbs_target_g: Optional[int] = None
    fats_target_g: Optional[int] = None
    saturated_fats_target_g: Optional[int] = 20
    water_target_ml: Optional[int] = None

class FoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    unit_type: UnitType = 'g'
    base_qty: float = 100.0
    serving_description: Optional[str] = None
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float
    saturated_fats_g: Optional[float] = 0.0
    monounsaturated_fats_g: Optional[float] = 0.0
    polyunsaturated_fats_g: Optional[float] = 0.0
    trans_fats_g: Optional[float] = 0.0
    cholesterol_mg: Optional[float] = 0.0
    fiber_g: Optional[float] = 0.0
    sodium_mg: Optional[float] = 0.0
    barcode: Optional[str] = None
    nova_group: Optional[int] = None

class FoodLogCreate(BaseModel):
    date: date
    meal_type: MealType
    food_source: Optional[FoodSource] = 'master'
    food_master_id: Optional[UUID] = None
    food_custom_id: Optional[UUID] = None
    food_name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    qty: float
    unit_type: Optional[str] = 'g'
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float
    saturated_fats_g: Optional[float] = 0.0
    monounsaturated_fats_g: Optional[float] = 0.0
    polyunsaturated_fats_g: Optional[float] = 0.0
    trans_fats_g: Optional[float] = 0.0
    cholesterol_mg: Optional[float] = 0.0
    fiber_g: Optional[float] = 0.0
    sodium_mg: Optional[float] = 0.0
    nova_group: Optional[int] = None

class WaterLogCreate(BaseModel):
    date: date
    amount_ml: int

class WeightLogCreate(BaseModel):
    date: date
    weight_kg: float
    body_fat_pct: Optional[float] = None
    muscle_mass_pct: Optional[float] = None
    body_water_pct: Optional[float] = None
    basal_metabolism_kcal: Optional[int] = None
    metabolic_age: Optional[int] = None
    waist_cm: Optional[float] = None
