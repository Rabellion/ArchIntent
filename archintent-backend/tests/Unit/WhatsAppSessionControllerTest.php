<?php

namespace Tests\Unit;

use App\Models\WhatsAppSession;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class WhatsAppSessionControllerTest extends TestCase
{
    private array $headers;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.internal_api_key' => 'test-internal-key']);
        $this->headers = ['X-Internal-Key' => 'test-internal-key'];

        // Not RefreshDatabase: that runs every migration this app has ever
        // had, including one with a MySQL-only `ALTER TABLE ... CHANGE`
        // that SQLite (this test's driver) rejects outright. Creating just
        // this one table -- matching create_whatsapp_sessions_table exactly
        // -- gets a real Eloquent/HTTP-backed test without that collision.
        Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->unique();
            $table->longText('archive');
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('whatsapp_sessions');
        parent::tearDown();
    }

    public function test_every_route_requires_the_internal_key(): void
    {
        $this->getJson('/api/internal/whatsapp-session/default')->assertUnauthorized();
        $this->putJson('/api/internal/whatsapp-session/default', ['archive' => 'x'])->assertUnauthorized();
        $this->deleteJson('/api/internal/whatsapp-session/default')->assertUnauthorized();

        $this->getJson('/api/internal/whatsapp-session/default', ['X-Internal-Key' => 'wrong'])->assertUnauthorized();
    }

    public function test_fetching_a_session_that_was_never_saved_is_404(): void
    {
        $this->getJson('/api/internal/whatsapp-session/default', $this->headers)->assertNotFound();
    }

    public function test_saving_then_fetching_round_trips_the_archive(): void
    {
        $archive = base64_encode('pretend-zip-bytes');

        $this->putJson('/api/internal/whatsapp-session/default', ['archive' => $archive], $this->headers)
            ->assertOk()
            ->assertJsonPath('data.size_bytes', strlen($archive));

        $this->getJson('/api/internal/whatsapp-session/default', $this->headers)
            ->assertOk()
            ->assertJsonPath('data.archive', $archive)
            ->assertJsonPath('data.session_id', 'default');
    }

    public function test_saving_again_overwrites_in_place_rather_than_duplicating(): void
    {
        $this->putJson('/api/internal/whatsapp-session/default', ['archive' => base64_encode('first')], $this->headers);
        $this->putJson('/api/internal/whatsapp-session/default', ['archive' => base64_encode('second')], $this->headers);

        $this->assertSame(1, WhatsAppSession::where('session_id', 'default')->count());
        $this->getJson('/api/internal/whatsapp-session/default', $this->headers)
            ->assertJsonPath('data.archive', base64_encode('second'));
    }

    public function test_different_session_ids_do_not_collide(): void
    {
        $this->putJson('/api/internal/whatsapp-session/support', ['archive' => base64_encode('support-data')], $this->headers);
        $this->putJson('/api/internal/whatsapp-session/sales', ['archive' => base64_encode('sales-data')], $this->headers);

        $this->getJson('/api/internal/whatsapp-session/support', $this->headers)
            ->assertJsonPath('data.archive', base64_encode('support-data'));
        $this->getJson('/api/internal/whatsapp-session/sales', $this->headers)
            ->assertJsonPath('data.archive', base64_encode('sales-data'));
    }

    public function test_an_oversized_archive_is_rejected_and_not_saved(): void
    {
        config(['otp.openwa.max_session_archive_bytes' => 10]);

        $this->putJson('/api/internal/whatsapp-session/default', ['archive' => str_repeat('a', 11)], $this->headers)
            ->assertStatus(413);

        $this->assertSame(0, WhatsAppSession::where('session_id', 'default')->count());
    }

    public function test_deleting_removes_the_saved_session(): void
    {
        $this->putJson('/api/internal/whatsapp-session/default', ['archive' => base64_encode('x')], $this->headers);

        $this->deleteJson('/api/internal/whatsapp-session/default', [], $this->headers)->assertOk();

        $this->getJson('/api/internal/whatsapp-session/default', $this->headers)->assertNotFound();
    }
}
