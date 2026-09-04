<?php

namespace App\Models;

use Database\Factories\ContactMessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * 前台「联系企业」表单落库的留言。
 */
#[Fillable(['name', 'email', 'phone', 'company', 'subject', 'message', 'status', 'handled_at'])]
class ContactMessage extends Model
{
    use HasFactory;

    public const STATUSES = ['new', 'read', 'replied', 'archived'];

    protected function casts(): array
    {
        return [
            'handled_at' => 'datetime',
        ];
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeUnread(Builder $query): void
    {
        $query->where('status', 'new');
    }
}
