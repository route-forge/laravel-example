<?php

namespace App\Http\Resources;

use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SiteSetting
 */
class SiteSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'site_name'      => $this->site_name,
            'brand_slogan'   => $this->brand_slogan,
            'logo_url'       => $this->logo_url,
            'intro'          => $this->intro,
            'contact_phone'  => $this->contact_phone,
            'contact_email'  => $this->contact_email,
            'contact_address' => $this->contact_address,
            'icp'            => $this->icp,
        ];
    }
}
