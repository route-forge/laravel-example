<?php

namespace App\Http\Resources;

use App\Models\Catalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Catalog
 */
class CatalogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'slug'         => $this->slug,
            'title'        => $this->title,
            'subtitle'     => $this->subtitle,
            'summary'      => $this->summary,
            'cover_image'  => $this->cover_image,
            'theme_color'  => $this->theme_color,
            'status'       => $this->status,
            'published_at' => $this->published_at?->toIso8601String(),
            // withCount 命中时读原始聚合列；未 withCount 的调用方退化成一次 count 查询，
            // 保证 page_count 恒在（whenCounted 的 MissingValue 会让键整个消失，前端拿 undefined）
            'page_count'   => $this->resource->pages_count ?? $this->pages()->count(),
            // 只有详情接口 with('pages') 时才带整本页面，列表接口保持轻量
            'pages'        => CatalogPageResource::collection($this->whenLoaded('pages')),
        ];
    }
}
