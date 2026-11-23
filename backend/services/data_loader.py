"""
Loads and caches static JSON data files at startup.
All other services import from here.
"""
import json, os
from functools import lru_cache

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache()
def get_crops() -> dict:
    return {c["id"]: c for c in _load("crops.json")}


@lru_cache()
def get_kits() -> dict:
    return {k["kit_id"]: k for k in _load("kits.json")}


@lru_cache()
def get_nutrients() -> dict:
    return {n["kit_id"]: n for n in _load("nutrients.json")}


@lru_cache()
def get_products() -> dict:
    return {p["id"]: p for p in _load("products.json")}


def get_crop(crop_id: str):
    return get_crops().get(crop_id)

def get_kit(crop_id: str):
    return get_kits().get(crop_id)

def get_nutrient(crop_id: str):
    return get_nutrients().get(crop_id)

def all_crops_list():
    return list(get_crops().values())
