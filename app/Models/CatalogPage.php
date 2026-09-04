<?php

namespace App\Models;

use Database\Factories\CatalogPageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * 画册内的一页，前台按 sort_order 逐页翻。
 */
#[Fillable(['catalog_id', 'sort_order', 'title', 'body', 'image', 'layout', 'tone'])]
class CatalogPage extends Model
{
    use HasFactory;

    /**
     * 版式白名单：前台 PageFlip 组件按 layout 选渲染骨架，未知值一律降级为 text。
     */
    public const LAYOUTS = ['cover', 'text', 'split', 'image', 'quote', 'back'];

    public const TONES = ['light', 'dark'];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Catalog, $this>
     */
    public function catalog(): BelongsTo
    {
        return $this->belongsTo(Catalog::class);
    }

    protected static function newFactory(): CatalogPageFactory
    {
        return CatalogPageFactory::new();
    }
}
