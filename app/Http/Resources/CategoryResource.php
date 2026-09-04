<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\MissingValue;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'   => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            // 管理端统计全部（withCount('catalogs')）
            'catalogs_count' => $this->whenCounted('catalogs'),
            // 公开侧只统计已发布（withCount 别名聚合，whenCounted 不支持别名，手动判断）
            'published_count' => isset($this->resource->published_count)
                ? $this->resource->published_count
                : new MissingValue(),
        ];
    }
}
