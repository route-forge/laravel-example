<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CatalogResource;
use App\Models\Catalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * 公开画册数据接口（level = public，靠 config/forge.php 的 match.prefix: ['api'] 归级）。
 *
 * 前端调用方式：useForgeApi('public') → api('api.catalogs.index', { query: {...} })。
 */
class CatalogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 9), 1), 30);

        return CatalogResource::collection(
            Catalog::published()
                ->withCount('pages')
                ->paginate($perPage)
                ->withQueryString(),
        );
    }

    /**
     * 整本画册 + 全部页面，前台翻页组件一次取完。
     */
    public function show(string $slug): CatalogResource
    {
        $catalog = Catalog::published()
            ->with('pages')
            ->withCount('pages')
            ->where('slug', $slug)
            ->firstOrFail();

        return CatalogResource::make($catalog);
    }
}
