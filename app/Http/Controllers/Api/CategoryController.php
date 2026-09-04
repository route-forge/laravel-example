<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * 公开分类列表（level = public）：前台列表页的分类筛选条数据源。
 */
class CategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        // 只统计名下已发布画册的数量；全空分类（published_count=0）可由前端决定是否隐藏
        $categories = Category::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->withCount(['catalogs as published_count' => fn ($q) => $q->published()])
            ->get();

        return CategoryResource::collection($categories);
    }
}
