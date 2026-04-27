<?php

declare(strict_types=1);

namespace Locagest\Tests\Unit\Service;

use Locagest\Service\FileService;
use Locagest\Tests\Unit\LocagestUnitTestCase;

class FileServiceTest extends LocagestUnitTestCase {

    // ── extension_for_mime ───────────────────────────────────────────────────────

    public function test_jpeg_donne_jpg(): void {
        $this->assertSame( 'jpg', FileService::extension_for_mime( 'image/jpeg' ) );
    }

    public function test_jpg_donne_jpg(): void {
        $this->assertSame( 'jpg', FileService::extension_for_mime( 'image/jpg' ) );
    }

    public function test_png_donne_png(): void {
        $this->assertSame( 'png', FileService::extension_for_mime( 'image/png' ) );
    }

    public function test_webp_donne_webp(): void {
        $this->assertSame( 'webp', FileService::extension_for_mime( 'image/webp' ) );
    }

    public function test_inconnu_donne_jpg(): void {
        $this->assertSame( 'jpg', FileService::extension_for_mime( 'image/bmp' ) );
    }
}
