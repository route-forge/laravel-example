<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CatalogResource;
use App\Models\Catalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * 公开画册数据接口（level = public，显式 tier('public') 归级）。
 *
 * 前端调用方式：useForgeApi('public') → api('api.catalogs.index', { query: {...} })。
 */
class CatalogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 9), 1), 30);

        $query = Catalog::published()
            ->with('category')
            ->withCount('pages');

        // 分类筛选：传分类 slug（列表页筛选条的值），无效 slug 自然得到空列表
        if ($slug = trim((string) $request->query('category'))) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $slug));
        }

        return CatalogResource::collection(
            $query->paginate($perPage)->withQueryString(),
        );
    }

    /**
     * 整本画册 + 全部页面，前台翻页组件一次取完。
     */
    public function show(string $slug): CatalogResource
    {
        $catalog = Catalog::published()
            ->with(['pages', 'category'])
            ->withCount('pages')
            ->where('slug', $slug)
            ->firstOrFail();

        return CatalogResource::make($catalog);
    }
}
