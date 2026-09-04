<?php

namespace App\Http\Resources;

use App\Models\CatalogPage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CatalogPage
 */
class CatalogPageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'catalog_id' => $this->catalog_id,
            'sort_order' => $this->sort_order,
            'title'      => $this->title,
            'body'       => $this->body,
            'image'      => $this->image,
            'layout'     => $this->layout,
            'tone'       => $this->tone,
        ];
    }
}
